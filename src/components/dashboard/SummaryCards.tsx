import { ArrowDownRight, ArrowUpRight, CalendarDays, Minus, TrendingUp, Wallet, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CategoryIcon } from "@/components/ui/CategoryBadge";
import type { DashboardStats } from "@/lib/analytics";
import { formatCurrency, formatPercent } from "@/lib/format";

function StatCard({ label, icon: Icon, value, footer }: { label: string; icon?: LucideIcon; value: ReactNode; footer: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-2">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted" aria-hidden />}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</div>
      <div className="mt-1.5 text-sm text-muted">{footer}</div>
    </div>
  );
}

function MonthChange({ change }: { change: number | null }) {
  if (change === null) return <>No spending last month</>;
  // Spending more is the unfavorable direction; the icon and words carry it, not color alone.
  const flat = Math.abs(change) < 0.005;
  const up = change > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex items-center gap-0.5 font-medium ${flat ? "text-ink-2" : up ? "text-danger" : "text-success"}`}>
        <Icon className="h-4 w-4" aria-hidden />
        {flat ? "No change" : `${formatPercent(Math.abs(change))} ${up ? "more" : "less"}`}
      </span>
      than last month
    </span>
  );
}

export function SummaryCards({ stats, monthLabel }: { stats: DashboardStats; monthLabel: string }) {
  const top = stats.topCategory;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={`Spent in ${monthLabel}`}
        icon={CalendarDays}
        value={formatCurrency(stats.thisMonth)}
        footer={<MonthChange change={stats.monthChange} />}
      />
      <StatCard
        label="Daily average"
        icon={TrendingUp}
        value={formatCurrency(stats.dailyAverage)}
        footer={`${stats.thisMonthCount} transaction${stats.thisMonthCount === 1 ? "" : "s"} this month`}
      />
      <StatCard
        label="Total tracked"
        icon={Wallet}
        value={formatCurrency(stats.allTime)}
        footer={`${stats.allTimeCount} expense${stats.allTimeCount === 1 ? "" : "s"} all time`}
      />
      <StatCard
        label="Top category this month"
        value={
          top ? (
            <span className="flex items-center gap-2.5">
              <CategoryIcon category={top.category} />
              {top.category}
            </span>
          ) : (
            <span className="text-muted">None yet</span>
          )
        }
        footer={top ? `${formatCurrency(top.total)} · ${formatPercent(top.share)} of the month` : "Add an expense this month"}
      />
    </div>
  );
}
