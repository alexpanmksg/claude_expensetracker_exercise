import { Archive, CalendarRange, ChartPie, Landmark, type LucideIcon } from "lucide-react";
import { sumAmounts, totalsByCategory, type CategoryTotal } from "../analytics";
import { DATE_PRESETS } from "../filters";
import { addMonths, formatCurrency, formatDate, formatMonth, formatPercent, monthKey, parseISODate, toISODate } from "../format";
import type { Expense } from "../types";
import { describeRange, highlights, inRange, previousMonth } from "./digest";
import type { DateRange, ExportFormat, Report, ReportColumn, ReportSection, TemplateId } from "./types";

export interface TemplateSpec {
  id: TemplateId;
  name: string;
  /** Who it's for, shown under the name. */
  audience: string;
  description: string;
  icon: LucideIcon;
  defaultFormat: ExportFormat;
  formats: ExportFormat[];
  defaultRange: (now: Date) => DateRange;
  build: (expenses: Expense[], range: DateRange, now: Date) => Report;
}

const col = (label: string, kind: ReportColumn["kind"]): ReportColumn => ({ label, kind });

const EXPENSE_COLUMNS = [col("Date", "date"), col("Category", "category"), col("Description", "text"), col("Amount", "money")];
const expenseRows = (rows: Expense[]) => rows.map((e) => [e.date, e.category, e.description, e.amount]);

function categorySection(totals: CategoryTotal[]): ReportSection {
  return {
    title: "By category",
    columns: [col("Category", "category"), col("Expenses", "number"), col("Total", "money"), col("Share", "percent")],
    rows: totals.map((c) => [c.category, c.count, c.total, c.share]),
  };
}

function base(id: TemplateId, name: string, rows: Expense[], range: DateRange, now: Date) {
  return { templateId: id, title: `${name} · ${describeRange(range)}`, subtitle: describeRange(range), range, generatedAt: now.toISOString(), records: rows.length };
}

const preset = (id: string, now: Date) => DATE_PRESETS.find((p) => p.id === id)!.range(now);

/** The months (YYYY-MM) a range touches, oldest first. */
function monthsIn({ from, to }: DateRange): string[] {
  if (!from || !to) return [];
  const keys: string[] = [];
  for (let key = from.slice(0, 7); key <= to.slice(0, 7); key = monthKey(addMonths(parseISODate(`${key}-01`), 1))) keys.push(key);
  return keys;
}

export const TEMPLATES: Record<TemplateId, TemplateSpec> = {
  "monthly-summary": {
    id: "monthly-summary",
    name: "Monthly Summary",
    audience: "For a quick monthly check-in",
    description: "Last month at a glance: totals, the change from the month before, category split and top expenses.",
    icon: CalendarRange,
    defaultFormat: "csv",
    formats: ["csv", "json"],
    defaultRange: (now) => preset("last-month", now),
    build(expenses, range, now) {
      const rows = inRange(expenses, range);
      const total = sumAmounts(rows);
      const prev = previousMonth(range);
      const prevTotal = prev ? sumAmounts(inRange(expenses, prev)) : 0;
      const days = range.to ? Number(range.to.slice(8, 10)) : 30;
      return {
        ...base("monthly-summary", "Monthly Summary", rows, range, now),
        stats: [
          { label: "Spent", value: formatCurrency(total) },
          { label: "Expenses", value: String(rows.length) },
          { label: "Daily average", value: formatCurrency(total / days) },
          {
            label: "vs previous month",
            value: prevTotal > 0 ? `${total >= prevTotal ? "+" : "−"}${formatPercent(Math.abs(total - prevTotal) / prevTotal)}` : "—",
            hint: prevTotal > 0 ? formatCurrency(prevTotal) : undefined,
          },
        ],
        highlights: highlights(expenses, range),
        sections: [
          categorySection(totalsByCategory(rows)),
          { title: "Top expenses", columns: EXPENSE_COLUMNS, rows: expenseRows([...rows].sort((a, b) => b.amount - a.amount).slice(0, 5)) },
        ],
      };
    },
  },

  "tax-report": {
    id: "tax-report",
    name: "Tax Report",
    audience: "For your accountant",
    description: "Year to date, totalled by category and month, with every expense itemized.",
    icon: Landmark,
    defaultFormat: "csv",
    formats: ["csv", "json"],
    defaultRange: (now) => ({ from: `${now.getFullYear()}-01-01`, to: toISODate(now) }),
    build(expenses, range, now) {
      const rows = inRange(expenses, range);
      const totals = totalsByCategory(rows);
      const months = monthsIn(range)
        .map((key) => {
          const items = rows.filter((e) => e.date.startsWith(key));
          return [formatMonth(key, "long"), items.length, sumAmounts(items)] as (string | number)[];
        })
        .filter((r) => r[1] !== 0);
      return {
        ...base("tax-report", "Tax Report", rows, range, now),
        stats: [
          { label: "Total spent", value: formatCurrency(sumAmounts(rows)) },
          { label: "Expenses", value: String(rows.length) },
          { label: "Largest category", value: totals[0]?.category ?? "—", hint: totals[0] ? formatCurrency(totals[0].total) : undefined },
        ],
        highlights: [],
        sections: [
          categorySection(totals),
          { title: "By month", columns: [col("Month", "text"), col("Expenses", "number"), col("Total", "money")], rows: months },
          { title: "All expenses", columns: EXPENSE_COLUMNS, rows: expenseRows(rows) },
        ],
        disclaimer:
          "Prepared from your Tally records. Tally doesn't know which expenses are deductible, so review this with a tax professional before filing.",
      };
    },
  },

  "category-analysis": {
    id: "category-analysis",
    name: "Category Analysis",
    audience: "For spotting trends",
    description: "Six months of spending by category, with each category's share, average expense and trend.",
    icon: ChartPie,
    defaultFormat: "csv",
    formats: ["csv", "json"],
    defaultRange: (now) => ({ from: toISODate(addMonths(now, -5)), to: toISODate(now) }),
    build(expenses, range, now) {
      const rows = inRange(expenses, range);
      const totals = totalsByCategory(rows);
      const keys = monthsIn(range);
      const half = Math.floor(keys.length / 2);
      const profile = totals.map((c) => {
        const items = rows.filter((e) => e.category === c.category);
        const early = sumAmounts(items.filter((e) => keys.indexOf(monthKey(e.date)) < half));
        const late = sumAmounts(items.filter((e) => keys.indexOf(monthKey(e.date)) >= half));
        // Trend compares the second half of the period with the first; null when there's no baseline.
        return { ...c, average: c.total / c.count, trend: early > 0 ? (late - early) / early : null };
      });
      const grower = profile.filter((p) => p.trend !== null).sort((a, b) => b.trend! - a.trend!)[0];
      const frequent = [...profile].sort((a, b) => b.count - a.count)[0];
      return {
        ...base("category-analysis", "Category Analysis", rows, range, now),
        stats: [
          { label: "Categories used", value: String(totals.length) },
          { label: "Total spent", value: formatCurrency(sumAmounts(rows)) },
          { label: "Biggest", value: totals[0]?.category ?? "—", hint: totals[0] ? formatPercent(totals[0].share) : undefined },
        ],
        highlights: [
          ...(totals[0] ? [`${totals[0].category} is your biggest category at ${formatPercent(totals[0].share)} of spending.`] : []),
          ...(grower && grower.trend! > 0.05
            ? [`${grower.category} is growing fastest: up ${formatPercent(grower.trend!)} in the last ${keys.length - half} months.`]
            : []),
          ...(frequent ? [`${frequent.category} is the most frequent, with ${frequent.count} expenses averaging ${formatCurrency(frequent.average)}.`] : []),
        ],
        sections: [
          {
            title: "Month by category",
            columns: [col("Category", "category"), ...keys.map((k) => col(formatMonth(k), "money")), col("Total", "money")],
            rows: totals.map((c) => [
              c.category,
              ...keys.map((k) => sumAmounts(rows.filter((e) => e.category === c.category && e.date.startsWith(k)))),
              c.total,
            ]),
          },
          {
            title: "Category profile",
            columns: [col("Category", "category"), col("Expenses", "number"), col("Total", "money"), col("Share", "percent"), col("Average", "money"), col("Trend", "trend")],
            rows: profile.map((p) => [p.category, p.count, p.total, p.share, p.average, p.trend]),
            note: `Trend compares the last ${keys.length - half} months with the ${half} before.`,
          },
        ],
      };
    },
  },

  "full-backup": {
    id: "full-backup",
    name: "Full Backup",
    audience: "For safekeeping",
    description: "Every expense you've recorded, ready to restore or move to another tool.",
    icon: Archive,
    defaultFormat: "json",
    formats: ["json", "csv"],
    defaultRange: () => ({ from: "", to: "" }),
    build(expenses, range, now) {
      const rows = inRange(expenses, range);
      const span = rows.length ? `${formatDate(rows[rows.length - 1].date)} – ${formatDate(rows[0].date)}` : "—";
      return {
        ...base("full-backup", "Full Backup", rows, range, now),
        title: `Full Backup · ${formatDate(toISODate(now))}`,
        stats: [
          { label: "Expenses", value: String(rows.length) },
          { label: "Total", value: formatCurrency(sumAmounts(rows)) },
          { label: "Covers", value: span },
        ],
        highlights: [],
        sections: [{ title: "Expenses", columns: EXPENSE_COLUMNS, rows: expenseRows(rows) }],
      };
    },
  },
};

export function buildReport(expenses: Expense[], templateId: TemplateId, range?: DateRange, now = new Date()): Report {
  const spec = TEMPLATES[templateId];
  return spec.build(expenses, range ?? spec.defaultRange(now), now);
}
