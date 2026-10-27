"use client";

import { Download, Plus, Receipt, SearchX, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { LoadErrorBanner } from "@/components/layout/LoadErrorBanner";
import { PageHeader } from "@/components/layout/PageHeader";
import { useExpenseDialog } from "@/components/providers/ExpenseDialogProvider";
import { useExpenses } from "@/components/providers/ExpensesProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { sumAmounts } from "@/lib/analytics";
import { downloadCsv } from "@/lib/csv";
import { EMPTY_FILTERS, filterExpenses, hasActiveFilters, sortExpenses } from "@/lib/filters";
import { formatCurrency } from "@/lib/format";
import type { ExpenseFilters as Filters, SortKey } from "@/lib/types";
import { ExpenseFilters } from "./ExpenseFilters";
import { ExpenseList } from "./ExpenseList";

export function ExpensesView() {
  const { expenses, isLoaded, loadSampleData, clearAll } = useExpenses();
  const { openAdd } = useExpenseDialog();
  const toast = useToast();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [confirmClear, setConfirmClear] = useState(false);

  const visible = useMemo(
    () => sortExpenses(filterExpenses(expenses, filters), sort),
    [expenses, filters, sort],
  );
  const filtered = hasActiveFilters(filters);

  const handleExport = () => {
    try {
      downloadCsv(visible);
      toast({
        title: "Export ready",
        description: `${visible.length} expense${visible.length === 1 ? "" : "s"} saved to CSV.`,
      });
    } catch {
      toast({ variant: "error", title: "Export failed", description: "Your browser blocked the download." });
    }
  };

  const handleSample = () => {
    try {
      const count = loadSampleData();
      toast({ title: "Sample data loaded", description: `Added ${count} example expenses.` });
    } catch (err) {
      toast({ variant: "error", title: "Couldn't load sample data", description: (err as Error).message });
    }
  };

  const handleClear = () => {
    setConfirmClear(false);
    try {
      clearAll();
      setFilters(EMPTY_FILTERS);
      toast({ title: "All expenses deleted" });
    } catch (err) {
      toast({ variant: "error", title: "Couldn't delete expenses", description: (err as Error).message });
    }
  };

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Search, filter, edit and export your spending."
        actions={
          expenses.length > 0 && (
            <>
              <button type="button" className="btn-secondary" onClick={handleExport} disabled={visible.length === 0}>
                <Download className="h-4 w-4" aria-hidden />
                Export CSV
              </button>
              <button
                type="button"
                className="btn-ghost text-danger hover:bg-danger/10 hover:text-danger"
                onClick={() => setConfirmClear(true)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Delete all
              </button>
            </>
          )
        }
      />
      <LoadErrorBanner />

      {!isLoaded ? (
        <div className="card space-y-4 p-5" aria-busy="true" aria-label="Loading expenses">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Receipt}
            title="No expenses yet"
            description="Add your first expense to start tracking, or load sample data to explore the app."
          >
            <button type="button" className="btn-primary" onClick={openAdd}>
              <Plus className="h-4 w-4" aria-hidden />
              Add expense
            </button>
            <button type="button" className="btn-secondary" onClick={handleSample}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Load sample data
            </button>
          </EmptyState>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card p-4 sm:p-5">
            <ExpenseFilters filters={filters} onChange={setFilters} sort={sort} onSortChange={setSort} />
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
              <p className="text-sm text-ink-2" aria-live="polite">
                <span className="font-medium text-ink">{visible.length}</span>{" "}
                {filtered ? `of ${expenses.length} ` : ""}
                expense{visible.length === 1 && !filtered ? "" : "s"}
              </p>
              <p className="text-sm text-ink-2">
                Total <span className="font-semibold tabular-nums text-ink">{formatCurrency(sumAmounts(visible))}</span>
              </p>
            </div>
            {visible.length > 0 ? (
              <ExpenseList key={`${sort}-${JSON.stringify(filters)}`} expenses={visible} />
            ) : (
              <EmptyState
                icon={SearchX}
                title="No matching expenses"
                description="Try a different search term, category or date range."
              >
                <button type="button" className="btn-secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear filters
                </button>
              </EmptyState>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Delete all expenses?"
        message={`This permanently removes all ${expenses.length} expenses from this browser. Export a CSV first if you want a backup.`}
        confirmLabel="Delete all"
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}
