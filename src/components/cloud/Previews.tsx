"use client";

import { FileSpreadsheet, Hash, Paperclip, Sheet } from "lucide-react";
import { useState } from "react";
import { formatCell } from "@/lib/cloud/render";
import { formatBytes } from "@/lib/cloud/time";
import type { JobTarget, Report } from "@/lib/cloud/types";
import { SimulatedBadge } from "./ui";

interface FileInfo {
  filename: string;
  bytes: number;
}

function Attachment({ filename, bytes }: FileInfo) {
  return (
    <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
      <FileSpreadsheet className="h-4 w-4 shrink-0 text-accent" aria-hidden />
      <span className="truncate font-mono text-xs text-ink">{filename}</span>
      <span className="shrink-0 text-xs text-muted">{formatBytes(bytes)}</span>
    </div>
  );
}

export function EmailPreview({ report, target, file }: { report: Report; target: JobTarget; file: FileInfo }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="space-y-1.5 border-b border-border bg-surface-2/60 px-4 py-3 text-xs">
        <p className="flex gap-2">
          <span className="w-14 shrink-0 text-muted">From</span>
          <span className="text-ink">Tally reports</span>
          <span className="ml-auto">
            <SimulatedBadge />
          </span>
        </p>
        <p className="flex gap-2">
          <span className="w-14 shrink-0 text-muted">To</span>
          <span className="min-w-0 truncate text-ink">{target.recipients?.length ? target.recipients.join(", ") : <span className="text-muted">No recipients yet</span>}</span>
        </p>
        <p className="flex gap-2">
          <span className="w-14 shrink-0 text-muted">Subject</span>
          <span className="min-w-0 truncate font-medium text-ink">{target.subject || "(no subject)"}</span>
        </p>
      </div>
      <div className="px-4 py-4 text-sm text-ink-2">
        {target.message && <p className="whitespace-pre-line text-ink">{target.message}</p>}
        <div className="mt-3 rounded-lg border border-border">
          <p className="border-b border-border px-3 py-2 text-xs font-semibold text-ink">{report.title}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 px-3 py-2 text-xs">
            {report.stats.map((s) => (
              <div key={s.label} className="flex justify-between gap-2">
                <dt className="text-muted">{s.label}</dt>
                <dd className="font-medium tabular-nums text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        {report.highlights.length > 0 && (
          <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs">
            {report.highlights.slice(0, 3).map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}
        <div>
          <Attachment {...file} />
        </div>
      </div>
    </div>
  );
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** A spreadsheet-like grid with one tab per report section, as it would land in Google Sheets. */
export function SheetPreview({ report, spreadsheet }: { report: Report; spreadsheet: string }) {
  const [tab, setTab] = useState(0);
  const section = report.sections[Math.min(tab, report.sections.length - 1)];
  const rows = section.rows.slice(0, 10);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Sheet className="h-4 w-4 text-success" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{spreadsheet || "Untitled spreadsheet"}</span>
        <SimulatedBadge />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-[11px]">
          <thead>
            <tr className="bg-surface-2 text-muted">
              <th className="w-8 border border-border" aria-label="Row" />
              {section.columns.map((_, i) => (
                <th key={i} className="min-w-[5.5rem] border border-border px-1 py-0.5 font-normal">
                  {LETTERS[i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border bg-surface-2 text-center text-muted">1</td>
              {section.columns.map((c) => (
                <td key={c.label} className="border border-border px-1.5 py-0.5 font-semibold text-ink">
                  {c.label}
                </td>
              ))}
            </tr>
            {rows.map((row, r) => (
              <tr key={r}>
                <td className="border border-border bg-surface-2 text-center text-muted">{r + 2}</td>
                {row.map((value, i) => (
                  <td key={i} className={`max-w-[10rem] truncate border border-border px-1.5 py-0.5 text-ink-2 ${section.columns[i].kind === "text" || section.columns[i].kind === "category" ? "" : "text-right"}`}>
                    {value === null ? "" : formatCell(value, section.columns[i].kind)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {section.rows.length > rows.length && <p className="px-3 py-1 text-[11px] text-muted">… {section.rows.length - rows.length} more rows</p>}
      <div className="flex gap-px overflow-x-auto border-t border-border bg-surface-2 px-1 pt-1" role="tablist" aria-label="Sheets">
        {report.sections.map((s, i) => (
          <button
            key={s.title}
            type="button"
            role="tab"
            aria-selected={i === tab}
            onClick={() => setTab(i)}
            className={`shrink-0 rounded-t-md px-3 py-1 text-xs ${i === tab ? "bg-surface font-medium text-ink" : "text-ink-2 hover:text-ink"}`}
          >
            {s.title}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SlackPreview({ report, channel, file }: { report: Report; channel: string; file: FileInfo }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-sm font-semibold text-ink">
        <Hash className="h-4 w-4 text-muted" aria-hidden />
        {channel.replace(/^#/, "") || "channel"}
        <span className="ml-auto">
          <SimulatedBadge />
        </span>
      </div>
      <div className="flex gap-3 px-3 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-fg" aria-hidden>
          T
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <p className="flex items-center gap-1.5">
            <span className="font-semibold text-ink">Tally</span>
            <span className="rounded bg-surface-2 px-1 text-[10px] font-semibold text-muted">APP</span>
            <span className="text-xs text-muted">now</span>
          </p>
          <p className="mt-0.5 font-semibold text-ink">{report.title}</p>
          <p className="text-ink-2">{report.stats.map((s) => `${s.label}: ${s.value}`).join(" · ")}</p>
          {report.highlights.length > 0 && (
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-2">
              {report.highlights.slice(0, 3).map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          )}
          <Attachment {...file} />
        </div>
      </div>
    </div>
  );
}

export function FilePreviewChip({ file }: { file: FileInfo }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted">
      <Paperclip className="h-3.5 w-3.5" aria-hidden />
      <span className="font-mono text-ink-2">{file.filename}</span> · {formatBytes(file.bytes)}
    </p>
  );
}
