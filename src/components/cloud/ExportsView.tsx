"use client";

import { CloudUpload, FlaskConical, Link2, Send, Sparkles } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { useCloud } from "@/components/providers/CloudProvider";
import { useExpenses } from "@/components/providers/ExpensesProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import type { DateRange, IntegrationId, Schedule, TemplateId } from "@/lib/cloud/types";
import { ConnectDialog } from "./ConnectFlow";
import { ExportComposer, type ComposerPreset } from "./ExportComposer";
import { HistoryTab, IntegrationsTab, OverviewTab, SchedulesTab, SharesTab, useTabCounts, type TabActions, type TabId } from "./ExportsTabs";
import { ScheduleEditor } from "./ScheduleEditor";
import { ShareDialog } from "./ShareDialog";
import { describeSync } from "./SyncIndicator";
import { useNow } from "./ui";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "integrations", label: "Integrations" },
  { id: "schedules", label: "Schedules" },
  { id: "history", label: "History" },
  { id: "shares", label: "Shared links" },
];

export function ExportsView() {
  const { expenses, isLoaded: expensesLoaded, loadSampleData } = useExpenses();
  const { isLoaded, syncStatus } = useCloud();
  const toast = useToast();
  const now = useNow();
  const counts = useTabCounts();
  const [tab, setTab] = useState<TabId>("overview");
  const [composer, setComposer] = useState<ComposerPreset | null>(null);
  const [share, setShare] = useState<{ templateId?: TemplateId; range?: DateRange } | null>(null);
  const [editor, setEditor] = useState<{ schedule?: Schedule; initial?: Partial<Schedule> } | null>(null);
  const [connectId, setConnectId] = useState<IntegrationId | null>(null);

  const actions: TabActions = {
    compose: setComposer,
    share: setShare,
    editSchedule: (schedule, initial) => setEditor({ schedule, initial }),
    connect: setConnectId,
    goTo: setTab,
  };

  // Arrow keys move between tabs, as in any tab list.
  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length].id;
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  if (!expensesLoaded || !isLoaded) {
    return (
      <div aria-busy="true" aria-label="Loading exports" className="space-y-4">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-10 w-96 max-w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const sync = describeSync(syncStatus, now);

  return (
    <>
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.12] via-accent/[0.03] to-transparent" aria-hidden />
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-surface/70 px-2.5 py-0.5 text-xs font-medium text-accent">
              <Sparkles className="h-3 w-3" aria-hidden />
              Export & share
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Send your spending anywhere</h1>
            <p className="mt-1 max-w-xl text-sm text-ink-2">
              Reports for your accountant, backups to the cloud, live spreadsheets and shareable links, all from one place.
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm">
              <span
                className={`h-2 w-2 rounded-full ${sync.tone === "ok" ? "bg-success" : sync.tone === "bad" ? "bg-danger" : sync.tone === "busy" ? "animate-pulse bg-accent" : "bg-baseline"}`}
                aria-hidden
              />
              <span className="font-medium text-ink">{sync.label}</span>
              <span className="hidden text-ink-2 sm:inline">· {sync.detail}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => setShare({})} disabled={expenses.length === 0}>
              <Link2 className="h-4 w-4" aria-hidden />
              Share link
            </button>
            <button type="button" className="btn-primary" onClick={() => setComposer({})} disabled={expenses.length === 0}>
              <Send className="h-4 w-4" aria-hidden />
              New export
            </button>
          </div>
        </div>
        <p className="relative flex items-center gap-1.5 border-t border-border bg-surface-2/60 px-5 py-2 text-xs text-ink-2 sm:px-6">
          <FlaskConical className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
          Demo: cloud services are simulated and nothing leaves this browser. Downloads, share links and QR codes are real.
        </p>
      </div>

      {expenses.length === 0 ? (
        <div className="card">
          <EmptyState icon={CloudUpload} title="Nothing to export yet" description="Add some expenses, or load the sample data, to try templates, integrations and sharing.">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                try {
                  toast({ title: "Sample data loaded", description: `Added ${loadSampleData()} example expenses.` });
                } catch (err) {
                  toast({ variant: "error", title: "Couldn't load sample data", description: (err as Error).message });
                }
              }}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Load sample data
            </button>
          </EmptyState>
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Export sections" className="no-scrollbar -mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-border px-1" onKeyDown={onTabKey}>
            {TABS.map((t) => {
              const selected = t.id === tab;
              return (
                <button
                  key={t.id}
                  id={`tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`panel-${t.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                    selected ? "border-accent text-ink" : "border-transparent text-ink-2 hover:text-ink"
                  }`}
                >
                  {t.label}
                  {counts[t.id] !== null && (
                    <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${selected ? "bg-accent/10 text-accent" : "bg-surface-2 text-muted"}`}>{counts[t.id]}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === "overview" && <OverviewTab actions={actions} />}
            {tab === "integrations" && <IntegrationsTab actions={actions} />}
            {tab === "schedules" && <SchedulesTab actions={actions} />}
            {tab === "history" && <HistoryTab actions={actions} />}
            {tab === "shares" && <SharesTab actions={actions} />}
          </div>
        </>
      )}

      {composer && <ExportComposer preset={composer} onClose={() => setComposer(null)} />}
      {share && <ShareDialog preset={share} onClose={() => setShare(null)} />}
      {editor && <ScheduleEditor schedule={editor.schedule} initial={editor.initial} onClose={() => setEditor(null)} />}
      <ConnectDialog id={connectId} onClose={() => setConnectId(null)} />
    </>
  );
}
