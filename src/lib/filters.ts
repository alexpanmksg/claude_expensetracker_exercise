import { addDays, addMonths, toISODate } from "./format";
import type { Expense, ExpenseFilters, SortKey } from "./types";

export const EMPTY_FILTERS: ExpenseFilters = { search: "", category: "All", from: "", to: "" };

export function hasActiveFilters(f: ExpenseFilters): boolean {
  return f.search.trim() !== "" || f.category !== "All" || f.from !== "" || f.to !== "";
}

export function filterExpenses(expenses: Expense[], f: ExpenseFilters): Expense[] {
  const query = f.search.trim().toLowerCase();
  return expenses.filter(
    (e) =>
      (f.category === "All" || e.category === f.category) &&
      (!f.from || e.date >= f.from) &&
      (!f.to || e.date <= f.to) &&
      (!query ||
        e.description.toLowerCase().includes(query) ||
        e.category.toLowerCase().includes(query) ||
        e.amount.toFixed(2).includes(query)),
  );
}

export function sortExpenses(expenses: Expense[], sort: SortKey): Expense[] {
  const sorted = [...expenses];
  // Ties fall back to creation time so same-day entries keep a stable order.
  const byDate = (a: Expense, b: Expense) =>
    a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
  switch (sort) {
    case "date-desc":
      return sorted.sort((a, b) => byDate(b, a));
    case "date-asc":
      return sorted.sort(byDate);
    case "amount-desc":
      return sorted.sort((a, b) => b.amount - a.amount || byDate(b, a));
    case "amount-asc":
      return sorted.sort((a, b) => a.amount - b.amount || byDate(b, a));
  }
}

export interface DatePreset {
  id: string;
  label: string;
  range: (now: Date) => { from: string; to: string };
}

export const DATE_PRESETS: DatePreset[] = [
  { id: "all", label: "All time", range: () => ({ from: "", to: "" }) },
  {
    id: "this-month",
    label: "This month",
    range: (now) => ({ from: toISODate(addMonths(now, 0)), to: toISODate(now) }),
  },
  {
    id: "last-month",
    label: "Last month",
    range: (now) => ({
      from: toISODate(addMonths(now, -1)),
      to: toISODate(addDays(addMonths(now, 0), -1)),
    }),
  },
  {
    id: "last-30",
    label: "Last 30 days",
    range: (now) => ({ from: toISODate(addDays(now, -29)), to: toISODate(now) }),
  },
  {
    id: "this-year",
    label: "This year",
    range: (now) => ({ from: `${now.getFullYear()}-01-01`, to: toISODate(now) }),
  },
];

/** The preset whose range matches the filters exactly, if any. */
export function matchingPreset(f: ExpenseFilters, now = new Date()): string | null {
  return (
    DATE_PRESETS.find((p) => {
      const r = p.range(now);
      return r.from === f.from && r.to === f.to;
    })?.id ?? null
  );
}
