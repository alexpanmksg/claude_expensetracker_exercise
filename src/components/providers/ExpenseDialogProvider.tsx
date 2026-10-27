"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/format";
import type { Expense, ExpenseInput } from "@/lib/types";
import { useExpenses } from "./ExpensesProvider";
import { useToast } from "./ToastProvider";

interface ExpenseDialogContextValue {
  openAdd: () => void;
  openEdit: (expense: Expense) => void;
}

const ExpenseDialogContext = createContext<ExpenseDialogContextValue | null>(null);

type DialogState = { mode: "add" } | { mode: "edit"; expense: Expense } | null;

/** One add/edit dialog for the whole app, so any page or the header can open it. */
export function ExpenseDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>(null);
  const { addExpense, updateExpense } = useExpenses();
  const toast = useToast();

  const close = useCallback(() => setState(null), []);

  const handleSubmit = (input: ExpenseInput) => {
    // Errors propagate to ExpenseForm, which shows them inline.
    if (state?.mode === "edit") {
      updateExpense(state.expense.id, input);
      toast({ title: "Expense updated", description: `${input.description} · ${formatCurrency(input.amount)}` });
    } else {
      addExpense(input);
      toast({ title: "Expense added", description: `${input.description} · ${formatCurrency(input.amount)}` });
    }
    close();
  };

  const value = useMemo<ExpenseDialogContextValue>(
    () => ({
      openAdd: () => setState({ mode: "add" }),
      openEdit: (expense) => setState({ mode: "edit", expense }),
    }),
    [],
  );

  return (
    <ExpenseDialogContext.Provider value={value}>
      {children}
      <Modal
        open={state !== null}
        onClose={close}
        title={state?.mode === "edit" ? "Edit expense" : "Add expense"}
        description={state?.mode === "edit" ? "Update the details of this expense." : "Record a new expense."}
      >
        {state && (
          <ExpenseForm
            key={state.mode === "edit" ? state.expense.id : "new"}
            initial={state.mode === "edit" ? state.expense : undefined}
            onSubmit={handleSubmit}
            onCancel={close}
          />
        )}
      </Modal>
    </ExpenseDialogContext.Provider>
  );
}

export function useExpenseDialog(): ExpenseDialogContextValue {
  const ctx = useContext(ExpenseDialogContext);
  if (!ctx) throw new Error("useExpenseDialog must be used inside <ExpenseDialogProvider>");
  return ctx;
}
