"use client";

import { Search, X } from "lucide-react";
import { DATE_PRESETS, EMPTY_FILTERS, hasActiveFilters, matchingPreset } from "@/lib/filters";
import { CATEGORIES, isCategory, type ExpenseFilters as Filters, type SortKey } from "@/lib/types";

interface ExpenseFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
}

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "amount-desc", label: "Highest amount" },
  { value: "amount-asc", label: "Lowest amount" },
];

export function ExpenseFilters({ filters, onChange, sort, onSortChange }: ExpenseFiltersProps) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const activePreset = matchingPreset(filters);
  const invalidRange = filters.from !== "" && filters.to !== "" && filters.from > filters.to;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            aria-label="Search expenses"
            placeholder="Search description, category or amount"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            className="input pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:flex">
          <select
            aria-label="Filter by category"
            value={filters.category}
            onChange={(e) => set({ category: isCategory(e.target.value) ? e.target.value : "All" })}
            className="input lg:w-44"
          >
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort expenses"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="input lg:w-44"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1" role="group" aria-label="Date range presets">
          {DATE_PRESETS.map((preset) => {
            const active = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                onClick={() => set(preset.range(new Date()))}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="grid flex-1 grid-cols-2 gap-3 sm:flex-none">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">From</span>
              <input
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(e) => set({ from: e.target.value })}
                aria-invalid={invalidRange}
                className={`input py-1.5 sm:w-40 ${invalidRange ? "input-error" : ""}`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">To</span>
              <input
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(e) => set({ to: e.target.value })}
                aria-invalid={invalidRange}
                className={`input py-1.5 sm:w-40 ${invalidRange ? "input-error" : ""}`}
              />
            </label>
          </div>
          {hasActiveFilters(filters) && (
            <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => onChange(EMPTY_FILTERS)}>
              <X className="h-4 w-4" aria-hidden />
              Clear
            </button>
          )}
        </div>
      </div>
      {invalidRange && (
        <p role="alert" className="text-sm text-danger">
          The start date is after the end date, so no expenses match.
        </p>
      )}
    </div>
  );
}
