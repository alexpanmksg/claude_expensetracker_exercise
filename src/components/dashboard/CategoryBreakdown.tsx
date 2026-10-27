"use client";

import { PieChart } from "lucide-react";
import { CategoryIcon } from "@/components/ui/CategoryBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CategoryTotal } from "@/lib/analytics";
import { CATEGORY_META } from "@/lib/categories";
import { formatCurrency, formatPercent } from "@/lib/format";

/**
 * Horizontal bars, one per category. Every bar is direct-labeled with its
 * name, amount and share, so identity never rests on color alone (several
 * category hues are below 3:1 contrast on the light surface).
 */
export function CategoryBreakdown({ data }: { data: CategoryTotal[] }) {
  if (data.length === 0) {
    return <EmptyState icon={PieChart} title="No spending in this period" description="Pick a longer period to see a breakdown." />;
  }
  const max = data[0].total;

  return (
    <ul className="space-y-4">
      {data.map((c) => (
        <li key={c.category} title={`${c.count} expense${c.count === 1 ? "" : "s"}`}>
          <div className="flex items-center gap-3">
            <CategoryIcon category={c.category} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium text-ink">{c.category}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="font-semibold text-ink">{formatCurrency(c.total)}</span>
                  <span className="ml-2 inline-block w-9 text-right text-xs text-muted">{formatPercent(c.share)}</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-sm bg-surface-2" aria-hidden>
                <div
                  className="h-full rounded-r-[4px]"
                  style={{ width: `${Math.max((c.total / max) * 100, 1)}%`, backgroundColor: CATEGORY_META[c.category].color }}
                />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
