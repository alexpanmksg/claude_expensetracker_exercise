import { addMonths, formatMonth, monthKey } from "./format";
import { CATEGORIES, type Category, type Expense } from "./types";

export function sumAmounts(expenses: Expense[]): number {
  // Sum in cents to avoid float drift across many additions.
  return expenses.reduce((cents, e) => cents + Math.round(e.amount * 100), 0) / 100;
}

export function inMonth(expenses: Expense[], key: string): Expense[] {
  return expenses.filter((e) => monthKey(e.date) === key);
}

export interface CategoryTotal {
  category: Category;
  total: number;
  count: number;
  share: number;
}

/** Totals for every category that has spending, largest first. */
export function totalsByCategory(expenses: Expense[]): CategoryTotal[] {
  const grand = sumAmounts(expenses);
  return CATEGORIES.map((category) => {
    const items = expenses.filter((e) => e.category === category);
    const total = sumAmounts(items);
    return { category, total, count: items.length, share: grand > 0 ? total / grand : 0 };
  })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.total - a.total);
}

export interface MonthTotal {
  key: string;
  label: string;
  total: number;
  count: number;
}

/** The `months` calendar months ending at `end` (inclusive), oldest first, zero-filled. */
export function monthlyTotals(expenses: Expense[], months: number, end = new Date()): MonthTotal[] {
  return Array.from({ length: months }, (_, i) => {
    const key = monthKey(addMonths(end, i - months + 1));
    const items = inMonth(expenses, key);
    return { key, label: formatMonth(key), total: sumAmounts(items), count: items.length };
  });
}

export interface DashboardStats {
  thisMonth: number;
  lastMonth: number;
  /** Fractional change vs last month; null when last month had no spending. */
  monthChange: number | null;
  thisMonthCount: number;
  allTime: number;
  allTimeCount: number;
  dailyAverage: number;
  topCategory: CategoryTotal | null;
}

export function dashboardStats(expenses: Expense[], now = new Date()): DashboardStats {
  const current = inMonth(expenses, monthKey(now));
  const previous = inMonth(expenses, monthKey(addMonths(now, -1)));
  const thisMonth = sumAmounts(current);
  const lastMonth = sumAmounts(previous);
  return {
    thisMonth,
    lastMonth,
    monthChange: lastMonth > 0 ? (thisMonth - lastMonth) / lastMonth : null,
    thisMonthCount: current.length,
    allTime: sumAmounts(expenses),
    allTimeCount: expenses.length,
    dailyAverage: thisMonth / now.getDate(),
    topCategory: totalsByCategory(current)[0] ?? null,
  };
}

/** A round axis maximum with ~4 evenly spaced ticks. */
export function niceScale(max: number, tickCount = 4): { max: number; ticks: number[] } {
  if (max <= 0) return { max: 100, ticks: [0, 25, 50, 75, 100] };
  const rough = max / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough)!;
  const niceMax = Math.ceil(max / step) * step;
  return {
    max: niceMax,
    ticks: Array.from({ length: Math.round(niceMax / step) + 1 }, (_, i) => i * step),
  };
}
