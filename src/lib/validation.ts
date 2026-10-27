import { isValidISODate, todayISO } from "./format";
import { isCategory, type ExpenseInput } from "./types";

export const MAX_AMOUNT = 1_000_000;
export const MAX_DESCRIPTION = 100;
export const MIN_DATE = "2000-01-01";

/** Raw form state: amount stays a string so partial input like "12." is preserved. */
export interface ExpenseFormValues {
  date: string;
  amount: string;
  category: string;
  description: string;
}

export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormValues, string>>;

export function validateExpenseForm(values: ExpenseFormValues): ExpenseFormErrors {
  const errors: ExpenseFormErrors = {};

  const amount = values.amount.trim();
  if (!amount) {
    errors.amount = "Enter an amount.";
  } else if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(amount.replace(/,/g, ""))) {
    errors.amount = "Use a number with up to 2 decimal places.";
  } else {
    const n = Number(amount.replace(/,/g, ""));
    if (n <= 0) errors.amount = "Amount must be greater than zero.";
    else if (n > MAX_AMOUNT) errors.amount = "Amount must be $1,000,000 or less.";
  }

  if (!values.date) {
    errors.date = "Pick a date.";
  } else if (!isValidISODate(values.date)) {
    errors.date = "Enter a valid date.";
  } else if (values.date > todayISO()) {
    errors.date = "Date can't be in the future.";
  } else if (values.date < MIN_DATE) {
    errors.date = "Date must be in 2000 or later.";
  }

  if (!isCategory(values.category)) errors.category = "Choose a category.";

  const description = values.description.trim();
  if (!description) errors.description = "Add a short description.";
  else if (description.length > MAX_DESCRIPTION)
    errors.description = `Keep it under ${MAX_DESCRIPTION} characters.`;

  return errors;
}

/** Call only after validateExpenseForm returned no errors. */
export function toExpenseInput(values: ExpenseFormValues): ExpenseInput {
  return {
    date: values.date,
    amount: Math.round(Number(values.amount.replace(/,/g, "")) * 100) / 100,
    category: values.category as ExpenseInput["category"],
    description: values.description.trim().replace(/\s+/g, " "),
  };
}
