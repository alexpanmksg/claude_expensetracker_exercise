"use client";

import { ArrowRight, Plus, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { LoadErrorBanner } from "@/components/layout/LoadErrorBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { useExpenseDialog } from "@/components/providers/ExpenseDialogProvider";
import { useExpenses } from "@/components/providers/ExpensesProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { dashboardStats, monthlyTotals, totalsByCategory } from "@/lib/analytics";
import { DATE_PRESETS, filterExpenses, EMPTY_FILTERS, sortExpenses } from "@/lib/filters";
import { formatMonth, monthKey } from "@/lib/format";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { MonthlyTrendChart } from "./MonthlyTrendChart";
import { SummaryCards } from "./SummaryCards";

const BREAKDOWN_PERIODS = ["this-month", "last-month", "this-year", "all"] as const;

function Panel({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card flex flex-col ${className}`}>
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}

export function DashboardView() {
  const { expenses, isLoaded, loadSampleData } = useExpenses();
  const { openAdd } = useExpenseDialog();
  const toast = useToast();
  const [period, setPeriod] = useState<(typeof BREAKDOWN_PERIODS)[number]>("this-month");

  const now = useMemo(() => new Date(), []);
  const stats = useMemo(() => dashboardStats(expenses, now), [expenses, now]);
  const trend = useMemo(() => monthlyTotals(expenses, 6, now), [expenses, now]);
  const breakdown = useMemo(() => {
    const preset = DATE_PRESETS.find((p) => p.id === period)!;
    return totalsByCategory(filterExpenses(expenses, { ...EMPTY_FILTERS, ...preset.range(now) }));
  }, [expenses, period, now]);
  const recent = useMemo(() => sortExpenses(expenses, "date-desc").slice(0, 5), [expenses]);

  const handleSample = () => {
    try {
      const count = loadSampleData();
      toast({ title: "Sample data loaded", description: `Added ${count} example expenses.` });
    } catch (err) {
      toast({ variant: "error", title: "Couldn't load sample data", description: (err as Error).message });
    }
  };

  const header = (
    <PageHeader
      title="Dashboard"
      // The page is prerendered at build time, so the date-dependent part waits for the client.
      subtitle={`Your spending at a glance${isLoaded ? ` · ${formatMonth(monthKey(now), "long")}` : ""}`}
    />
  );

  if (!isLoaded) {
    return (
      <div aria-busy="true" aria-label="Loading dashboard">
        {header}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card space-y-3 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-80 rounded-xl lg:col-span-3" />
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <>
        {header}
        <LoadErrorBanner />
        <div className="card">
          <EmptyState
            icon={Wallet}
            title="Welcome to Tally"
            description="Track where your money goes. Add an expense to see totals, trends and category breakdowns here."
          >
            <button type="button" className="btn-primary" onClick={openAdd}>
              <Plus className="h-4 w-4" aria-hidden />
              Add your first expense
            </button>
            <button type="button" className="btn-secondary" onClick={handleSample}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Load sample data
            </button>
          </EmptyState>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <LoadErrorBanner />
      <SummaryCards stats={stats} monthLabel={formatMonth(monthKey(now), "short")} />

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel title="Monthly spending" className="lg:col-span-3" action={<span className="text-xs text-muted">Last 6 months</span>}>
          <MonthlyTrendChart data={trend} />
        </Panel>
        <Panel
          title="By category"
          className="lg:col-span-2"
          action={
            <select
              aria-label="Category breakdown period"
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof period)}
              className="input w-auto py-1 pr-8 text-xs"
            >
              {BREAKDOWN_PERIODS.map((id) => (
                <option key={id} value={id}>
                  {DATE_PRESETS.find((p) => p.id === id)!.label}
                </option>
              ))}
            </select>
          }
        >
          <CategoryBreakdown data={breakdown} />
        </Panel>
      </div>

      <section className="card mt-4 overflow-hidden">
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">Recent expenses</h2>
          <Link href="/expenses" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            View all
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <ExpenseList expenses={recent} paginate={false} />
      </section>
    </>
  );
}
