import { escapeCell } from "../csv";
import { formatCurrency, formatDate, formatPercent, toISODate } from "../format";
import type { ColumnKind, ExportFormat, Report } from "./types";

type Cell = string | number | null;

/** How a cell reads on screen. */
export function formatCell(value: Cell, kind: ColumnKind): string {
  if (value === null || value === "") return "—";
  switch (kind) {
    case "money":
      return formatCurrency(Number(value));
    case "percent":
      return formatPercent(Number(value));
    case "trend": {
      const n = Number(value);
      return Math.abs(n) < 0.005 ? "Flat" : `${n > 0 ? "↑" : "↓"} ${formatPercent(Math.abs(n))}`;
    }
    case "date":
      return formatDate(String(value));
    case "number":
      return Number(value).toLocaleString("en-US");
    default:
      return String(value);
  }
}

/** How a cell reads in a spreadsheet: plain numbers, ISO dates. */
function csvCell(value: Cell, kind: ColumnKind): string {
  if (value === null) return "";
  if (kind === "money") return Number(value).toFixed(2);
  if (kind === "percent" || kind === "trend") return `${(Number(value) * 100).toFixed(1)}%`;
  return escapeCell(String(value));
}

/** One CSV holding every section in turn, each with its own title and header row. */
export function reportToCsv(report: Report): string {
  const lines: string[] = [escapeCell(report.title), escapeCell(`Generated ${formatDate(toISODate(new Date(report.generatedAt)))}`)];
  for (const section of report.sections) {
    lines.push("", escapeCell(section.title), section.columns.map((c) => escapeCell(c.label)).join(","));
    for (const row of section.rows) lines.push(row.map((v, i) => csvCell(v, section.columns[i].kind)).join(","));
  }
  if (report.disclaimer) lines.push("", escapeCell(report.disclaimer));
  return lines.join("\r\n");
}

const keyFor = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ""));

export function reportToJson(report: Report): string {
  return JSON.stringify(
    {
      app: "Tally",
      version: 1,
      template: report.templateId,
      title: report.title,
      range: { from: report.range.from || null, to: report.range.to || null },
      generatedAt: report.generatedAt,
      records: report.records,
      stats: report.stats,
      highlights: report.highlights,
      sections: report.sections.map((s) => ({
        title: s.title,
        rows: s.rows.map((row) => Object.fromEntries(s.columns.map((c, i) => [keyFor(c.label), row[i]]))),
      })),
      ...(report.disclaimer && { disclaimer: report.disclaimer }),
    },
    null,
    2,
  );
}

export function reportFilename(report: Report, format: ExportFormat): string {
  const { from, to } = report.range;
  const span = from || to ? `${from || "start"}-to-${to || "today"}` : toISODate(new Date(report.generatedAt));
  return `tally-${report.templateId}-${span}.${format}`;
}

export function reportFile(report: Report, format: ExportFormat): { blob: Blob; filename: string } {
  // BOM so Excel opens the CSV as UTF-8.
  const blob =
    format === "csv"
      ? new Blob(["﻿" + reportToCsv(report)], { type: "text/csv;charset=utf-8" })
      : new Blob([reportToJson(report)], { type: "application/json" });
  return { blob, filename: reportFilename(report, format) };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next task: some browsers start reading the URL after click() returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
