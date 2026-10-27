"use client";

import { AlertTriangle, X } from "lucide-react";
import { useExpenses } from "@/components/providers/ExpensesProvider";

export function LoadErrorBanner() {
  const { loadError, dismissLoadError } = useExpenses();
  if (!loadError) return null;
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/[0.06] px-4 py-3 text-sm text-ink"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
      <p className="flex-1">{loadError}</p>
      <button type="button" aria-label="Dismiss" className="icon-btn -my-1 h-7 w-7" onClick={dismissLoadError}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
