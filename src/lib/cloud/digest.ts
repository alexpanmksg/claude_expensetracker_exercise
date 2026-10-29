import { sumAmounts, totalsByCategory } from "../analytics";
import { EMPTY_FILTERS, filterExpenses, sortExpenses } from "../filters";
import { addDays, addMonths, formatCurrency, formatDate, formatDateShort, formatMonth, formatPercent, parseISODate, toISODate } from "../format";
import type { Expense } from "../types";
import type { DateRange } from "./types";

export function inRange(expenses: Expense[], { from, to }: DateRange): Expense[] {
  return sortExpenses(filterExpenses(expenses, { ...EMPTY_FILTERS, from, to }), "date-desc");
}

/** True when the range is exactly one calendar month, e.g. 2026-09-01 to 2026-09-30. */
function wholeMonth({ from, to }: DateRange): boolean {
  if (!from || !to || !from.endsWith("-01")) return false;
  return to === toISODate(addDays(addMonths(parseISODate(from), 1), -1));
}

export function describeRange(range: DateRange): string {
  if (wholeMonth(range)) return formatMonth(range.from.slice(0, 7), "long");
  if (range.from && range.to) {
    const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4);
    return `${sameYear ? formatDateShort(range.from) : formatDate(range.from)} – ${formatDate(range.to)}`;
  }
  if (range.from) return `Since ${formatDate(range.from)}`;
  if (range.to) return `Through ${formatDate(range.to)}`;
  return "All time";
}

/** The calendar month before the range starts, for "vs last month" comparisons. */
export function previousMonth({ from }: DateRange): DateRange | null {
  if (!from) return null;
  const start = addMonths(parseISODate(from), -1);
  return { from: toISODate(start), to: toISODate(addDays(addMonths(start, 1), -1)) };
}

/** A few plain-language sentences about a period, used by reports, emails and Slack posts. */
export function highlights(expenses: Expense[], range: DateRange): string[] {
  const rows = inRange(expenses, range);
  if (rows.length === 0) return [`No spending was recorded for ${describeRange(range)}.`];

  const total = sumAmounts(rows);
  const out = [`You spent ${formatCurrency(total)} across ${rows.length} ${rows.length === 1 ? "expense" : "expenses"} in ${describeRange(range)}.`];

  const prev = previousMonth(range);
  if (prev && wholeMonth(range)) {
    const prevTotal = sumAmounts(inRange(expenses, prev));
    if (prevTotal > 0) {
      const change = (total - prevTotal) / prevTotal;
      const label = formatMonth(prev.from.slice(0, 7), "long").split(" ")[0];
      out.push(
        Math.abs(change) < 0.01
          ? `That's about the same as ${label} (${formatCurrency(prevTotal)}).`
          : `That's ${formatPercent(Math.abs(change))} ${change > 0 ? "more" : "less"} than ${label} (${formatCurrency(prevTotal)}).`,
      );
    }
  }

  const [top] = totalsByCategory(rows);
  if (top) out.push(`${top.category} made up ${formatPercent(top.share)} of spending (${formatCurrency(top.total)}).`);

  const largest = rows.reduce((a, b) => (b.amount > a.amount ? b : a));
  out.push(`The largest single expense was ${largest.description} (${formatCurrency(largest.amount)}) on ${formatDateShort(largest.date)}.`);
  return out;
}
