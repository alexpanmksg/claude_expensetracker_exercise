"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useExpenseDialog } from "@/components/providers/ExpenseDialogProvider";
import { CategoryBadge, CategoryIcon } from "@/components/ui/CategoryBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { useDeleteExpense } from "./useDeleteExpense";

const PAGE_SIZE = 50;

interface ExpenseListProps {
  expenses: Expense[];
  /** Paginate with a "Show more" button; off for short lists like "Recent". */
  paginate?: boolean;
}

export function ExpenseList({ expenses, paginate = true }: ExpenseListProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const { openEdit } = useExpenseDialog();
  const remove = useDeleteExpense();
  const shown = paginate ? expenses.slice(0, visible) : expenses;

  return (
    <div>
      <ul className="divide-y divide-border">
        {shown.map((expense) => (
          <li
            key={expense.id}
            className="group flex items-center gap-2.5 px-4 py-3 sm:gap-3 transition-colors hover:bg-surface-2/60 sm:px-5"
          >
            <CategoryIcon category={expense.category} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{expense.description}</p>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted md:hidden">
                <span>{expense.category}</span>
                <span aria-hidden>·</span>
                <time dateTime={expense.date}>{formatDate(expense.date)}</time>
              </p>
            </div>
            <div className="hidden w-36 md:block">
              <CategoryBadge category={expense.category} />
            </div>
            <time dateTime={expense.date} className="hidden w-28 text-sm text-ink-2 md:block">
              {formatDate(expense.date)}
            </time>
            <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-ink md:w-24">
              {formatCurrency(expense.amount)}
            </p>
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                className="icon-btn"
                aria-label={`Edit ${expense.description}`}
                onClick={() => openEdit(expense)}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="icon-btn hover:bg-danger/10 hover:text-danger"
                aria-label={`Delete ${expense.description}`}
                onClick={() => remove(expense.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {paginate && expenses.length > visible && (
        <div className="border-t border-border p-3 text-center">
          <button type="button" className="btn-ghost" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            Show more ({expenses.length - visible} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
