"use client";

import { useState, type FormEvent } from "react";
import { CATEGORY_META } from "@/lib/categories";
import { todayISO } from "@/lib/format";
import { CATEGORIES, type Expense, type ExpenseInput } from "@/lib/types";
import {
  MAX_DESCRIPTION,
  MIN_DATE,
  toExpenseInput,
  validateExpenseForm,
  type ExpenseFormErrors,
  type ExpenseFormValues,
} from "@/lib/validation";

interface ExpenseFormProps {
  initial?: Expense;
  /** Throwing an Error shows its message as a form-level error. */
  onSubmit: (input: ExpenseInput) => void;
  onCancel: () => void;
}

function initialValues(expense?: Expense): ExpenseFormValues {
  return expense
    ? {
        date: expense.date,
        amount: expense.amount.toFixed(2),
        category: expense.category,
        description: expense.description,
      }
    : { date: todayISO(), amount: "", category: "", description: "" };
}

export function ExpenseForm({ initial, onSubmit, onCancel }: ExpenseFormProps) {
  const [values, setValues] = useState(() => initialValues(initial));
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    // After the first submit attempt, re-validate live so errors clear as they're fixed.
    if (submitted) setErrors(validateExpenseForm(next));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    const found = validateExpenseForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstInvalid = (["amount", "date", "category", "description"] as const).find((k) => found[k]);
      document.getElementById(`expense-${firstInvalid}`)?.focus();
      return;
    }
    try {
      onSubmit(toExpenseInput(values));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  const fieldError = (key: keyof ExpenseFormValues) =>
    errors[key] ? (
      <p id={`expense-${key}-error`} className="mt-1.5 text-sm text-danger">
        {errors[key]}
      </p>
    ) : null;

  const describedBy = (key: keyof ExpenseFormValues) => (errors[key] ? `expense-${key}-error` : undefined);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="expense-amount" className="label">
            Amount
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">$</span>
            <input
              id="expense-amount"
              data-autofocus
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={values.amount}
              onChange={(e) => set("amount", e.target.value)}
              onBlur={() => {
                // Normalize "12.5" to "12.50" once the user leaves the field.
                const n = Number(values.amount.replace(/,/g, ""));
                if (values.amount.trim() && Number.isFinite(n) && n > 0) set("amount", n.toFixed(2));
              }}
              aria-invalid={!!errors.amount}
              aria-describedby={describedBy("amount")}
              className={`input pl-7 tabular-nums ${errors.amount ? "input-error" : ""}`}
            />
          </div>
          {fieldError("amount")}
        </div>

        <div>
          <label htmlFor="expense-date" className="label">
            Date
          </label>
          <input
            id="expense-date"
            type="date"
            min={MIN_DATE}
            max={todayISO()}
            value={values.date}
            onChange={(e) => set("date", e.target.value)}
            aria-invalid={!!errors.date}
            aria-describedby={describedBy("date")}
            className={`input ${errors.date ? "input-error" : ""}`}
          />
          {fieldError("date")}
        </div>
      </div>

      <fieldset>
        <legend className="label">Category</legend>
        <div
          id="expense-category"
          tabIndex={-1}
          className="grid grid-cols-2 gap-2 focus:outline-none sm:grid-cols-3"
          aria-describedby={describedBy("category")}
        >
          {CATEGORIES.map((category) => {
            const { icon: Icon, color } = CATEGORY_META[category];
            const selected = values.category === category;
            return (
              <label
                key={category}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40 ${
                  selected
                    ? "border-accent bg-accent/[0.06] font-medium text-ink"
                    : errors.category
                      ? "border-danger/60 text-ink-2 hover:bg-surface-2"
                      : "border-border text-ink-2 hover:bg-surface-2"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={category}
                  checked={selected}
                  onChange={() => set("category", category)}
                  className="sr-only"
                />
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {category}
              </label>
            );
          })}
        </div>
        {fieldError("category")}
      </fieldset>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="expense-description" className="label">
            Description
          </label>
          <span
            className={`text-xs tabular-nums ${values.description.length > MAX_DESCRIPTION ? "text-danger" : "text-muted"}`}
          >
            {values.description.length}/{MAX_DESCRIPTION}
          </span>
        </div>
        <input
          id="expense-description"
          autoComplete="off"
          placeholder="e.g. Weekly groceries"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          aria-invalid={!!errors.description}
          aria-describedby={describedBy("description")}
          className={`input ${errors.description ? "input-error" : ""}`}
        />
        {fieldError("description")}
      </div>

      {formError && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/[0.06] px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {initial ? "Save changes" : "Add expense"}
        </button>
      </div>
    </form>
  );
}
