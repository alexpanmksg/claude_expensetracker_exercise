"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { generateSampleExpenses } from "@/lib/sample-data";
import { loadExpenses, saveExpenses, STORAGE_KEY } from "@/lib/storage";
import type { Expense, ExpenseInput } from "@/lib/types";

interface ExpensesContextValue {
  expenses: Expense[];
  /** False until localStorage has been read on the client. */
  isLoaded: boolean;
  loadError: string | null;
  dismissLoadError: () => void;
  // Mutations throw a user-readable Error if persisting fails; state is unchanged then.
  addExpense: (input: ExpenseInput) => Expense;
  updateExpense: (id: string, input: ExpenseInput) => void;
  deleteExpense: (id: string) => Expense | undefined;
  restoreExpense: (expense: Expense) => void;
  loadSampleData: () => number;
  clearAll: () => void;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Mutations read the latest list synchronously so they can persist before updating state.
  const latest = useRef<Expense[]>([]);

  useEffect(() => {
    const { expenses: stored, error } = loadExpenses();
    latest.current = stored;
    setExpenses(stored);
    setLoadError(error ?? null);
    setIsLoaded(true);

    // Keep multiple open tabs in sync.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = loadExpenses().expenses;
      latest.current = next;
      setExpenses(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((next: Expense[]) => {
    saveExpenses(next);
    latest.current = next;
    setExpenses(next);
  }, []);

  const addExpense = useCallback(
    (input: ExpenseInput) => {
      const now = new Date().toISOString();
      const expense: Expense = { ...input, id: newId(), createdAt: now, updatedAt: now };
      commit([...latest.current, expense]);
      return expense;
    },
    [commit],
  );

  const updateExpense = useCallback(
    (id: string, input: ExpenseInput) => {
      if (!latest.current.some((e) => e.id === id)) {
        throw new Error("That expense no longer exists.");
      }
      const now = new Date().toISOString();
      commit(latest.current.map((e) => (e.id === id ? { ...e, ...input, updatedAt: now } : e)));
    },
    [commit],
  );

  const deleteExpense = useCallback(
    (id: string) => {
      const target = latest.current.find((e) => e.id === id);
      if (target) commit(latest.current.filter((e) => e.id !== id));
      return target;
    },
    [commit],
  );

  const restoreExpense = useCallback(
    (expense: Expense) => {
      if (latest.current.some((e) => e.id === expense.id)) return;
      commit([...latest.current, expense]);
    },
    [commit],
  );

  const loadSampleData = useCallback(() => {
    const now = new Date();
    const samples = generateSampleExpenses(now).map((input, i): Expense => {
      // Offset timestamps so same-day samples keep a deterministic order.
      const stamp = new Date(now.getTime() + i).toISOString();
      return { ...input, id: newId(), createdAt: stamp, updatedAt: stamp };
    });
    commit([...latest.current, ...samples]);
    return samples.length;
  }, [commit]);

  const clearAll = useCallback(() => commit([]), [commit]);

  const value = useMemo<ExpensesContextValue>(
    () => ({
      expenses,
      isLoaded,
      loadError,
      dismissLoadError: () => setLoadError(null),
      addExpense,
      updateExpense,
      deleteExpense,
      restoreExpense,
      loadSampleData,
      clearAll,
    }),
    [expenses, isLoaded, loadError, addExpense, updateExpense, deleteExpense, restoreExpense, loadSampleData, clearAll],
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses(): ExpensesContextValue {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error("useExpenses must be used inside <ExpensesProvider>");
  return ctx;
}
