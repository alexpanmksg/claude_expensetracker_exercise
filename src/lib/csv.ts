import { todayISO } from "./format";
import type { Expense } from "./types";

function escapeCell(value: string): string {
  // Neutralize spreadsheet formula injection (=, +, -, @ at the start of a cell).
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function expensesToCsv(expenses: Expense[]): string {
  const header = ["Date", "Category", "Amount", "Description"];
  const rows = expenses.map((e) => [
    e.date,
    e.category,
    e.amount.toFixed(2),
    escapeCell(e.description),
  ]);
  return [header, ...rows].map((row) => row.join(",")).join("\r\n");
}

function csvBlob(expenses: Expense[]): Blob {
  // BOM so Excel opens the file as UTF-8.
  return new Blob(["﻿" + expensesToCsv(expenses)], { type: "text/csv;charset=utf-8" });
}

export function downloadCsv(expenses: Expense[], filename = `expenses-${todayISO()}.csv`): void {
  const url = URL.createObjectURL(csvBlob(expenses));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

type SaveFilePicker = (options: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<FileSystemFileHandle>;

/**
 * Asks where to save the CSV with the browser's Save dialog (Chrome, Edge), falling back to a
 * plain download elsewhere. Resolves to false if the person cancels the dialog.
 * Call it directly from a click handler: the dialog needs a fresh user gesture.
 */
export async function saveCsv(expenses: Expense[], filename = `expenses-${todayISO()}.csv`): Promise<boolean> {
  const win = window as Window & { showSaveFilePicker?: SaveFilePicker };
  if (!win.showSaveFilePicker) {
    downloadCsv(expenses, filename);
    return true;
  }
  let handle: FileSystemFileHandle;
  try {
    handle = await win.showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: "CSV file", accept: { "text/csv": [".csv"] } }],
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") return false;
    throw err;
  }
  const writable = await handle.createWritable();
  await writable.write(csvBlob(expenses));
  await writable.close();
  return true;
}
