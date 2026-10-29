"use client";

import { LayoutDashboard, ListOrdered, Plus, Send, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SyncIndicator } from "@/components/cloud/SyncIndicator";
import { useExpenseDialog } from "@/components/providers/ExpenseDialogProvider";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: ListOrdered },
  { href: "/exports", label: "Exports", icon: Send },
];

export function Header() {
  const pathname = usePathname();
  const { openAdd } = useExpenseDialog();
  // Recipients of a share link see the report on its own, without the app's navigation.
  const shared = pathname.startsWith("/shared");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
            <Wallet className="h-4 w-4" aria-hidden />
          </span>
          <span className="hidden sm:inline">Tally</span>
        </Link>

        {shared ? (
          <span className="text-sm text-muted">Shared report</span>
        ) : (
          <>
            <nav aria-label="Main" className="flex items-center gap-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2/70 hover:text-ink"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    <span className="sr-only sm:not-sr-only">{label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <SyncIndicator />
              <button type="button" className="btn-primary px-3 sm:px-4" onClick={openAdd}>
                <Plus className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">Add expense</span>
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
