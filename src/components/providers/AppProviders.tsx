"use client";

import type { ReactNode } from "react";
import { CloudProvider } from "./CloudProvider";
import { ExpenseDialogProvider } from "./ExpenseDialogProvider";
import { ExpensesProvider } from "./ExpensesProvider";
import { ToastProvider } from "./ToastProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ExpensesProvider>
        <ExpenseDialogProvider>
          <CloudProvider>{children}</CloudProvider>
        </ExpenseDialogProvider>
      </ExpensesProvider>
    </ToastProvider>
  );
}
