export const CURRENCY = "USD";
export const LOCALE = "en-US";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
});

const compactCurrencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/** Short form for axis ticks: $1.2K. */
export function formatCompactCurrency(amount: number): string {
  return compactCurrencyFormatter.format(amount);
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Parses YYYY-MM-DD as a local date (new Date("2026-01-05") would be UTC midnight). */
export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = parseISODate(value);
  return !Number.isNaN(date.getTime()) && toISODate(date) === value;
}

export function formatDate(value: string): string {
  return parseISODate(value).toLocaleDateString(LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(value: string): string {
  return parseISODate(value).toLocaleDateString(LOCALE, { month: "short", day: "numeric" });
}

/** YYYY-MM key for a date string or Date. */
export function monthKey(value: string | Date): string {
  return (typeof value === "string" ? value : toISODate(value)).slice(0, 7);
}

export function formatMonth(key: string, style: "short" | "long" = "short"): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(LOCALE, {
    month: style,
    ...(style === "long" ? { year: "numeric" } : {}),
  });
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function addDays(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}
