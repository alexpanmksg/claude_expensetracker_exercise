import { EyeOff, Info, Sparkles } from "lucide-react";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { formatCell } from "@/lib/cloud/render";
import type { Report, ReportColumn } from "@/lib/cloud/types";
import { isCategory } from "@/lib/types";

const NUMERIC = new Set<ReportColumn["kind"]>(["money", "number", "percent", "trend"]);

function Cell({ value, column }: { value: string | number | null; column: ReportColumn }) {
  if (column.kind === "category" && isCategory(value)) return <CategoryBadge category={value} />;
  if (column.kind === "trend" && typeof value === "number") {
    const tone = Math.abs(value) < 0.005 ? "text-muted" : value > 0 ? "text-danger" : "text-success";
    return <span className={tone}>{formatCell(value, column.kind)}</span>;
  }
  return <>{formatCell(value, column.kind)}</>;
}

/** Renders any template's report. `rowLimit` trims long tables for previews. */
export function ReportView({ report, rowLimit }: { report: Report; rowLimit?: number }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {report.stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-surface-2/50 px-3 py-2.5">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-ink">{s.value}</p>
            {s.hint && <p className="text-xs text-muted">{s.hint}</p>}
          </div>
        ))}
      </div>

      {report.highlights.length > 0 && (
        <div className="rounded-lg border border-accent/20 bg-accent/[0.05] p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Highlights
          </p>
          <ul className="space-y-1 text-sm text-ink-2">
            {report.highlights.map((h) => (
              <li key={h} className="flex gap-2">
                <span aria-hidden className="text-accent">
                  •
                </span>
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.redacted && (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <EyeOff className="h-3.5 w-3.5" aria-hidden />
          Descriptions were hidden by the sender.
        </p>
      )}

      {report.sections.map((section) => {
        const rows = rowLimit ? section.rows.slice(0, rowLimit) : section.rows;
        return (
          <section key={section.title}>
            <h3 className="mb-2 text-sm font-semibold text-ink">{section.title}</h3>
            {section.rows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted">No expenses in this period.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-surface-2 text-xs text-muted">
                    <tr>
                      {section.columns.map((c) => (
                        <th key={c.label} scope="col" className={`whitespace-nowrap px-3 py-2 font-medium ${NUMERIC.has(c.kind) ? "text-right" : "text-left"}`}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((value, i) => (
                          <td
                            key={i}
                            className={`whitespace-nowrap px-3 py-1.5 ${NUMERIC.has(section.columns[i].kind) ? "text-right tabular-nums" : ""} ${
                              section.columns[i].kind === "text" ? "max-w-[16rem] truncate text-ink" : "text-ink-2"
                            }`}
                          >
                            <Cell value={value} column={section.columns[i]} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {rowLimit && section.rows.length > rowLimit && (
              <p className="mt-1.5 text-xs text-muted">+ {section.rows.length - rowLimit} more rows in the file</p>
            )}
            {section.note && <p className="mt-1.5 text-xs text-muted">{section.note}</p>}
          </section>
        );
      })}

      {report.disclaimer && (
        <p className="flex gap-2 rounded-lg bg-surface-2 p-3 text-xs text-ink-2">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {report.disclaimer}
        </p>
      )}
    </div>
  );
}
