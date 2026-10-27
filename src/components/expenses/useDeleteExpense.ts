"use client";

import { useCallback } from "react";
import { useExpenses } from "@/components/providers/ExpensesProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { formatCurrency } from "@/lib/format";

const message = (err: unknown) => (err instanceof Error ? err.message : "Please try again.");

/** Deletes immediately and offers Undo in a toast, instead of a confirm prompt. */
export function useDeleteExpense() {
  const { deleteExpense, restoreExpense } = useExpenses();
  const toast = useToast();

  return useCallback(
    (id: string) => {
      try {
        const removed = deleteExpense(id);
        if (!removed) return;
        toast({
          title: "Expense deleted",
          description: `${removed.description} · ${formatCurrency(removed.amount)}`,
          action: {
            label: "Undo",
            onClick: () => {
              try {
                restoreExpense(removed);
              } catch (err) {
                toast({ variant: "error", title: "Couldn't restore expense", description: message(err) });
              }
            },
          },
        });
      } catch (err) {
        toast({ variant: "error", title: "Couldn't delete expense", description: message(err) });
      }
    },
    [deleteExpense, restoreExpense, toast],
  );
}
