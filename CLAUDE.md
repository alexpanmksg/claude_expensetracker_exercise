# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server on http://localhost:3000
npm run build    # production build (also runs lint + type-check)
npm run lint     # ESLint (next/core-web-vitals)
npx tsc --noEmit # type-check only
```

There is no test suite. Verify changes in the browser; the "Load sample data" button on the empty dashboard or Expenses page seeds about 120 deterministic expenses.

## Architecture

Next.js 14 App Router, TypeScript, Tailwind 3. Everything runs client-side and persists to `localStorage`. There is no backend.

- **Pages are thin server components** (`src/app/page.tsx`, `src/app/expenses/page.tsx`). They only export `metadata` and render a client `*View` component from `src/components/`. Pages are statically prerendered, so anything date-dependent or read from storage must wait for `isLoaded` to avoid hydration mismatches.
- **State lives in React context** (`src/components/providers/`), composed in `AppProviders` and mounted in the root layout. The nesting order matters: Toast → Expenses → ExpenseDialog → Cloud.
  - `ExpensesProvider` is the only place that touches expense storage (`CloudProvider` owns the separate export key; see below). Mutations persist first through `saveExpenses`, then set state. They read the latest list from a ref, not from state. A failed write throws a user-readable `Error` and leaves state unchanged. Callers catch it and show a toast or an inline form error. It also syncs across tabs through the `storage` event.
  - `ExpenseDialogProvider` owns the single add/edit modal. Call `useExpenseDialog().openAdd()` / `openEdit(expense)` from anywhere instead of rendering `ExpenseForm` yourself.
  - Deleting goes through `useDeleteExpense`, which deletes right away and offers Undo in a toast. There is no confirm prompt; only "Delete all" confirms.
- **Pure logic lives in `src/lib/`**, with no React: `validation.ts` (form rules), `filters.ts` (filtering, sorting, date presets), `analytics.ts` (totals, monthly series, chart axis scale), `csv.ts`, `storage.ts` (load validates each record and drops invalid ones), `sample-data.ts`.
- **Export & share** (`/exports`, `/shared`) is a cloud-style hub. The integrations (email, Google Sheets, Drive, Dropbox, OneDrive, Slack) are **simulated**: nothing leaves the browser, and the UI labels them so. Downloads, share links and QR codes are real.
  - `src/lib/cloud/`: `templates.ts` builds a `Report` (plain data) per template; `render.ts` turns reports into CSV/JSON; `integrations.ts` is the destination registry (steps, validation); `schedule.ts` computes next runs; `share.ts` packs a report into the URL fragment (`deflate-raw` + base64url) with an expiry, so links need no server and can't be revoked.
  - `CloudProvider` owns `expense-tracker:cloud:v1` (connections, schedules, job history, share links, backup state) with the same persist-then-set pattern. It runs jobs step by step on timers, runs due schedules while the app is open (missed runs collapse into one), counts expense changes since the last backup, and debounces live-sync jobs to Google Sheets. Downloads happen inside the click handler, since browsers block later ones.

## Conventions

- **Dates** are `YYYY-MM-DD` strings in local time, compared as strings. Use `parseISODate`/`toISODate` from `lib/format.ts`. Never use `new Date("YYYY-MM-DD")`, which parses as UTC.
- **Amounts** are numbers in dollars rounded to 2 decimals. Sum with `sumAmounts` (adds in cents). Display with `formatCurrency` (USD, `en-US`).
- **Colors are semantic tokens only.** They are RGB-channel CSS variables in `globals.css`, mapped in `tailwind.config.ts` (`bg-surface`, `text-ink-2`, `bg-accent/10`…), with a separate dark-mode block that follows `prefers-color-scheme`. Don't use raw Tailwind palette colors such as `text-gray-500`. Shared component classes (`.card`, `.input`, `.btn-primary`, …) live in `globals.css`.
- **Category colors** (`--cat-*`, wired through `lib/categories.ts`) are a validated categorical palette in a fixed order, with separate light and dark steps. Several sit below 3:1 contrast on light surfaces, so every chart mark that uses one must also show a text label.
- Adding a category means updating `CATEGORIES` in `lib/types.ts`, `CATEGORY_META`, the `--cat-*` variables (both modes) and `sample-data.ts`.
- Changing the stored `Expense` shape requires bumping `STORAGE_KEY` or migrating in `loadExpenses`, because records that fail validation are dropped.
