import { isValidISODate } from "./format";
import { isCategory, type Expense } from "./types";

export const STORAGE_KEY = "expense-tracker:expenses:v1";

export interface LoadResult {
  expenses: Expense[];
  /** Set when stored data was unreadable or some records had to be dropped. */
  error?: string;
}

function isExpense(value: unknown): value is Expense {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.date === "string" &&
    isValidISODate(e.date) &&
    typeof e.amount === "number" &&
    Number.isFinite(e.amount) &&
    e.amount > 0 &&
    isCategory(e.category) &&
    typeof e.description === "string" &&
    typeof e.createdAt === "string" &&
    typeof e.updatedAt === "string"
  );
}

export function loadExpenses(): LoadResult {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return { expenses: [], error: "Browser storage is unavailable, so changes won't be saved." };
  }
  if (raw === null) return { expenses: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { expenses: [], error: "Saved expense data was corrupted and could not be read." };
  }
  if (!Array.isArray(parsed)) {
    return { expenses: [], error: "Saved expense data was in an unexpected format." };
  }

  const expenses = parsed.filter(isExpense);
  const dropped = parsed.length - expenses.length;
  return dropped > 0
    ? { expenses, error: `${dropped} saved record${dropped === 1 ? " was" : "s were"} invalid and skipped.` }
    : { expenses };
}

/** Throws a user-readable Error when the write fails (quota exceeded, storage disabled). */
export function saveExpenses(expenses: Expense[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (err) {
    const quota = err instanceof DOMException && err.name === "QuotaExceededError";
    throw new Error(
      quota
        ? "Browser storage is full. Export and remove some expenses, then try again."
        : "Couldn't save to browser storage.",
    );
  }
}
