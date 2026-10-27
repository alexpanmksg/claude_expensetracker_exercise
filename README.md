# Tally: Expense Tracker

A personal expense tracker built with Next.js 14 (App Router), TypeScript and Tailwind CSS. Data is stored in your browser's `localStorage`. There is no account and no server.

## Features

- **Add, edit and delete expenses**, each with an amount, date, category and description. The form validates every field, and deleting can be undone from the toast.
- **Dashboard**: spending this month compared with last month, daily average, all-time total, top category, a 6-month spending chart, a category breakdown (this month, last month, this year or all time) and recent expenses.
- **Expenses page**: search, category filter, date presets plus a custom from/to range, sorting, and a running count and total for the current filters.
- **CSV export** of the expenses that match the current filters. The file opens in Excel or Google Sheets.
- Responsive layout for desktop and mobile, light and dark mode (following the system setting), keyboard-accessible dialogs, and loading and error states.

## Getting started

Requires Node.js 18.17 or later.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

For a production build:

```bash
npm run build
npm start
```

## Data

Expenses are saved under the `localStorage` key `expense-tracker:expenses:v1`, per browser and per origin. Clearing site data deletes them, so use **Export CSV** to keep a backup.
