"use client";

import { niceScale, type MonthTotal } from "@/lib/analytics";
import { formatCompactCurrency, formatCurrency, formatMonth } from "@/lib/format";

/**
 * Single-series column chart in plain HTML: thin columns anchored to the
 * baseline, hairline grid, a tooltip per column (hover or keyboard focus), a
 * direct label on the current month only. Each column is focusable and
 * labeled, so keyboard and screen-reader users get the same values.
 */
export function MonthlyTrendChart({ data }: { data: MonthTotal[] }) {
  const { max, ticks } = niceScale(Math.max(...data.map((d) => d.total)));
  const pct = (value: number) => (value / max) * 100;
  const currentKey = data[data.length - 1]?.key;

  return (
    <div>
      {/* Top margin leaves room for the current month's label above a full-height bar. */}
      <div className="mt-6 flex h-56 gap-2">
        {/* Y axis */}
        <div className="relative w-12 shrink-0 text-right text-[11px] tabular-nums text-muted" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 leading-none" style={{ bottom: `${pct(t)}%` }}>
              {formatCompactCurrency(t)}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div className="relative flex-1" role="group" aria-label="Spending per month">
          {ticks.map((t) => (
            <div
              key={t}
              aria-hidden
              className={`absolute inset-x-0 border-t ${t === 0 ? "border-baseline" : "border-grid"}`}
              style={{ bottom: `${pct(t)}%` }}
            />
          ))}
          <div className="absolute inset-0 flex">
            {data.map((d, i) => {
              const height = pct(d.total);
              const isCurrent = d.key === currentKey;
              const align = i === 0 ? "left-0" : i === data.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2";
              return (
                <div
                  key={d.key}
                  tabIndex={0}
                  role="img"
                  aria-label={`${formatMonth(d.key, "long")}: ${formatCurrency(d.total)}, ${d.count} expense${d.count === 1 ? "" : "s"}`}
                  className="group relative flex flex-1 cursor-default items-end justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  {/* Full-height hover wash: the hit target is the whole column, not just the bar. */}
                  <div aria-hidden className="absolute inset-x-1 inset-y-0 rounded-md bg-ink/[0.03] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                  {isCurrent && d.total > 0 && (
                    <span
                      aria-hidden
                      className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tabular-nums text-ink transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0"
                      style={{ bottom: `calc(${height}% + 6px)` }}
                    >
                      {formatCurrency(d.total)}
                    </span>
                  )}
                  <div
                    aria-hidden
                    className="relative w-[60%] max-w-10 rounded-t-[4px] bg-accent transition-colors group-hover:bg-accent-hover group-focus-visible:bg-accent-hover"
                    style={{ height: `${height}%`, minHeight: d.total > 0 ? 2 : 0 }}
                  />
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute z-10 hidden w-max min-w-32 rounded-lg border border-border bg-surface px-3 py-2 text-left shadow-pop group-hover:block group-focus-visible:block ${align}`}
                    style={{ bottom: `calc(${Math.min(height, 72)}% + 10px)` }}
                  >
                    <p className="text-xs font-medium text-muted">{formatMonth(d.key, "long")}</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{formatCurrency(d.total)}</p>
                    <p className="text-xs text-ink-2">
                      {d.count} expense{d.count === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X axis */}
      <div className="ml-14 mt-2 flex text-xs text-muted" aria-hidden>
        {data.map((d) => (
          <span key={d.key} className={`flex-1 text-center ${d.key === currentKey ? "font-semibold text-ink-2" : ""}`}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
