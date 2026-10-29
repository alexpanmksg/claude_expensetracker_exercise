"use client";

import {
  ArrowRight,
  CalendarClock,
  Copy,
  Download,
  ExternalLink,
  History as HistoryIcon,
  Link2,
  Pencil,
  Play,
  Plug,
  QrCode,
  RefreshCw,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useCloud } from "@/components/providers/CloudProvider";
import { useExpenses } from "@/components/providers/ExpensesProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { describeRange } from "@/lib/cloud/digest";
import { describeTarget, INTEGRATION_GROUPS, INTEGRATIONS } from "@/lib/cloud/integrations";
import { describeSchedule } from "@/lib/cloud/schedule";
import { buildReport, TEMPLATES } from "@/lib/cloud/templates";
import { formatBytes, formatDateTime, formatRelative, formatRunTime } from "@/lib/cloud/time";
import { TEMPLATE_IDS, type DateRange, type IntegrationId, type Job, type Schedule, type TemplateId } from "@/lib/cloud/types";
import type { ComposerPreset } from "./ExportComposer";
import { ShareQr, useCopy } from "./ShareDialog";
import { describeSync } from "./SyncIndicator";
import { IntegrationTile, SimulatedBadge, StatusChip, Switch, useNow } from "./ui";

export type TabId = "overview" | "integrations" | "schedules" | "history" | "shares";

export interface TabActions {
  compose: (preset: ComposerPreset) => void;
  share: (preset: { templateId?: TemplateId; range?: DateRange }) => void;
  editSchedule: (schedule?: Schedule, initial?: Partial<Schedule>) => void;
  connect: (id: IntegrationId) => void;
  goTo: (tab: TabId) => void;
}

const TRIGGER_LABEL = { manual: "Manual", schedule: "Scheduled", "live-sync": "Live sync" } as const;

function JobRow({ job, now, actions }: { job: Job; now: Date; actions?: TabActions }) {
  const { retry, downloadCopy } = useCloud();
  const spec = INTEGRATIONS[job.destination];
  const where = describeTarget(job.destination, job.target);
  return (
    <li className="flex items-start gap-3 px-4 py-3 sm:px-5">
      <IntegrationTile id={job.destination} active={job.status !== "failed"} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {TEMPLATES[job.templateId].name}
          <span className="font-normal text-muted"> → {spec.name}</span>
        </p>
        <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-xs text-muted">
          {where && <span className="max-w-[14rem] truncate">{where}</span>}
          {where && <span aria-hidden>·</span>}
          <span>{TRIGGER_LABEL[job.trigger]}</span>
          {job.records > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>
                {job.records} {job.records === 1 ? "record" : "records"}
              </span>
              <span aria-hidden>·</span>
              <span>{formatBytes(job.bytes)}</span>
            </>
          )}
        </p>
        {job.status === "failed" && job.error && <p className="mt-1 text-xs text-danger">{job.error}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <StatusChip status={job.status} label={job.status === "completed" ? spec.steps[spec.steps.length - 1] : undefined} />
        <time dateTime={job.createdAt} title={formatDateTime(job.createdAt)} className="text-xs text-muted">
          {formatRelative(job.createdAt, now)}
        </time>
        {actions && (
          <div className="-mr-1.5 flex">
            {job.status === "failed" && (
              <button type="button" className="icon-btn" aria-label="Retry" title="Retry" onClick={() => retry(job.id)}>
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            <button type="button" className="icon-btn" aria-label="Download a copy" title="Download a copy" onClick={() => downloadCopy(job)}>
              <Download className="h-4 w-4" />
            </button>
            <button type="button" className="icon-btn" aria-label="Share" title="Share as a link" onClick={() => actions.share({ templateId: job.templateId, range: job.range })}>
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function Card({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-4 py-2.5 sm:px-5">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const linkButton = "inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline";

// ---- Overview ----

export function OverviewTab({ actions }: { actions: TabActions }) {
  const { expenses } = useExpenses();
  const { state, syncStatus } = useCloud();
  const now = useNow();
  const reports = useMemo(() => TEMPLATE_IDS.map((id) => buildReport(expenses, id, undefined, now)), [expenses, now]);
  const sync = describeSync(syncStatus, now);
  const liveSync = state.connections.find((c) => c.liveSync);
  const upcoming = state.schedules.filter((s) => !s.paused).sort((a, b) => a.nextRunAt.localeCompare(b.nextRunAt))[0];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card title="Start from a template">
          <div className="grid gap-px bg-border sm:grid-cols-2">
            {reports.map((report) => {
              const t = TEMPLATES[report.templateId];
              return (
                <div key={t.id} className="flex flex-col bg-surface p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <t.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-ink">{t.name}</h3>
                      <p className="text-xs text-muted">
                        {describeRange(report.range)} · {report.records} {report.records === 1 ? "expense" : "expenses"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 flex-1 text-sm text-ink-2">{t.description}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="btn-secondary px-3 py-1.5" onClick={() => actions.compose({ templateId: t.id })}>
                      Export
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => actions.share({ templateId: t.id })}>
                      <Link2 className="h-3.5 w-3.5" aria-hidden />
                      Share
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card
          title="Recent activity"
          action={
            state.jobs.length > 0 && (
              <button type="button" className={linkButton} onClick={() => actions.goTo("history")}>
                View all
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            )
          }
        >
          {state.jobs.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">No exports yet. Pick a template to send your first one.</p>
          ) : (
            <ul className="divide-y divide-border">
              {state.jobs.slice(0, 5).map((job) => (
                <JobRow key={job.id} job={job} now={now} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <section className="card overflow-hidden">
          <div className={`px-5 py-4 ${sync.tone === "bad" ? "bg-danger/[0.06]" : sync.tone === "ok" ? "bg-success/[0.06]" : "bg-accent/[0.05]"}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Backup health</p>
            <p className={`mt-1 text-lg font-semibold ${sync.tone === "bad" ? "text-danger" : "text-ink"}`}>{sync.label}</p>
            <p className="mt-0.5 text-sm text-ink-2">{sync.detail}</p>
          </div>
          <div className="space-y-3 px-5 py-4">
            {liveSync?.liveSync && (
              <p className="flex items-center gap-2 text-xs text-ink-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-success" aria-hidden />
                Live sync to “{liveSync.liveSync.spreadsheet}” is on
              </p>
            )}
            <button type="button" className="btn-primary w-full" onClick={() => actions.compose({ templateId: "full-backup" })}>
              Back up now
            </button>
          </div>
        </section>

        <Card
          title="Connected services"
          action={
            <button type="button" className={linkButton} onClick={() => actions.goTo("integrations")}>
              Manage
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          }
        >
          {state.connections.length === 0 ? (
            <div className="px-5 py-5 text-sm text-ink-2">
              <p>Connect a service to send exports there and run them on a schedule.</p>
              <div className="mt-3 flex -space-x-1.5" aria-hidden>
                {(["google-sheets", "google-drive", "dropbox", "onedrive", "slack"] as const).map((id) => (
                  <span key={id} className="rounded-lg ring-2 ring-surface">
                    <IntegrationTile id={id} size="sm" />
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {state.connections.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-2.5">
                  <IntegrationTile id={c.id} size="sm" active />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{INTEGRATIONS[c.id].name}</p>
                    <p className="truncate text-xs text-muted">{c.lastDeliveryAt ? `Last delivery ${formatRelative(c.lastDeliveryAt, now)}` : c.account}</p>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-success" title="Connected" aria-label="Connected" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Up next"
          action={
            <button type="button" className={linkButton} onClick={() => actions.goTo("schedules")}>
              Schedules
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          }
        >
          {upcoming ? (
            <div className="flex items-start gap-3 px-5 py-4">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-ink">
                  {TEMPLATES[upcoming.templateId].name} → {INTEGRATIONS[upcoming.destination].name}
                </p>
                <p className="text-xs text-ink-2">
                  {formatRunTime(upcoming.nextRunAt)} ({formatRelative(upcoming.nextRunAt, now)})
                </p>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4">
              <p className="text-sm text-ink-2">Nothing scheduled.</p>
              <button type="button" className={`${linkButton} mt-2`} onClick={() => actions.editSchedule()}>
                Automate an export
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---- Integrations ----

export function IntegrationsTab({ actions }: { actions: TabActions }) {
  const { state, disconnect, setLiveSync } = useCloud();
  const toast = useToast();
  const now = useNow();

  return (
    <div className="space-y-6">
      {INTEGRATION_GROUPS.map((group) => (
        <section key={group}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{group}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(INTEGRATIONS)
              .filter((i) => i.group === group)
              .map((i) => {
                const conn = state.connections.find((c) => c.id === i.id);
                const builtIn = !i.provider;
                return (
                  <div key={i.id} className="card flex flex-col p-4">
                    <div className="flex items-start gap-3">
                      <IntegrationTile id={i.id} size="lg" active={builtIn || !!conn} />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-ink">
                          {i.name}
                          {i.provider && <SimulatedBadge />}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${builtIn || conn ? "bg-success" : "bg-baseline"}`} aria-hidden />
                          {builtIn ? "Always available" : conn ? `Connected as ${conn.account}` : "Not connected"}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 flex-1 text-sm text-ink-2">{i.description}</p>
                    {conn && (
                      <p className="mt-2 text-xs text-muted">
                        {conn.lastDeliveryAt ? `Last delivery ${formatRelative(conn.lastDeliveryAt, now)}` : `Connected ${formatRelative(conn.connectedAt, now)}`}
                      </p>
                    )}
                    {conn && i.liveSync && (
                      <div className="mt-3 flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-ink">Live sync</p>
                          <p className="truncate text-xs text-muted">{conn.liveSync ? `Mirroring into “${conn.liveSync.spreadsheet}”` : "Off"}</p>
                        </div>
                        <Switch
                          checked={!!conn.liveSync}
                          label={`Live sync to ${i.name}`}
                          onChange={(on) => {
                            setLiveSync(i.id, on ? "Tally expenses" : null);
                            toast({ title: on ? "Live sync on" : "Live sync off", description: on ? "Changes will appear in “Tally expenses” a few seconds after you make them." : undefined });
                          }}
                        />
                      </div>
                    )}
                    {!builtIn && (
                      <div className="mt-4">
                        {conn ? (
                          <button
                            type="button"
                            className="btn-ghost px-3 py-1.5 text-danger hover:bg-danger/10 hover:text-danger"
                            onClick={() => {
                              disconnect(i.id);
                              const affected = state.schedules.filter((s) => s.destination === i.id && !s.paused).length;
                              toast({
                                title: `${i.name} disconnected`,
                                description: affected ? `${affected} ${affected === 1 ? "schedule sends" : "schedules send"} here and will fail until you reconnect.` : undefined,
                              });
                            }}
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button type="button" className="btn-primary px-3 py-1.5" onClick={() => actions.connect(i.id)}>
                            <Plug className="h-4 w-4" aria-hidden />
                            Connect
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

// ---- Schedules ----

const SUGGESTIONS: { title: string; detail: string; schedule: Partial<Schedule> }[] = [
  {
    title: "Weekly backup to Google Drive",
    detail: "Every Monday at 9:00 AM",
    schedule: { templateId: "full-backup", destination: "google-drive", format: "json", frequency: "weekly", weekday: 1, time: "09:00" },
  },
  {
    title: "Monthly summary by email",
    detail: "On the 1st at 8:00 AM",
    schedule: { templateId: "monthly-summary", destination: "email", format: "csv", frequency: "monthly", monthDay: 1, time: "08:00" },
  },
  {
    title: "Category trends to Slack",
    detail: "Every Friday at 4:00 PM",
    schedule: { templateId: "category-analysis", destination: "slack", format: "csv", frequency: "weekly", weekday: 5, time: "16:00" },
  },
];

export function SchedulesTab({ actions }: { actions: TabActions }) {
  const { state, setSchedulePaused, runScheduleNow, deleteSchedule } = useCloud();
  const toast = useToast();
  const now = useNow();
  const [confirm, setConfirm] = useState<Schedule | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-2">Recurring exports run in the background while Tally is open, and catch up once when you return.</p>
        <button type="button" className="btn-primary shrink-0" onClick={() => actions.editSchedule()}>
          <CalendarClock className="h-4 w-4" aria-hidden />
          New schedule
        </button>
      </div>

      {state.schedules.length === 0 ? (
        <div className="card">
          <EmptyState icon={CalendarClock} title="No schedules yet" description="Automate backups and reports so they arrive without you lifting a finger." />
        </div>
      ) : (
        <ul className="space-y-3">
          {state.schedules.map((s) => (
            <li key={s.id} className={`card flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${s.paused ? "opacity-70" : ""}`}>
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <IntegrationTile id={s.destination} active={!s.paused} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {TEMPLATES[s.templateId].name} <span className="font-normal text-muted">→ {INTEGRATIONS[s.destination].name}</span>
                  </p>
                  <p className="text-xs text-ink-2">
                    {describeSchedule(s)}
                    {describeTarget(s.destination, s.target) && ` · ${describeTarget(s.destination, s.target)}`}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {s.paused ? <span>Paused</span> : <span>Next {formatRunTime(s.nextRunAt)} ({formatRelative(s.nextRunAt, now)})</span>}
                    {s.lastRunAt && s.lastStatus && (
                      <StatusChip status={s.lastStatus} label={`Last run ${formatRelative(s.lastRunAt, now)}`} />
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 self-end sm:self-auto">
                <Switch
                  checked={!s.paused}
                  label={s.paused ? "Resume schedule" : "Pause schedule"}
                  onChange={(on) => setSchedulePaused(s.id, !on)}
                />
                <button type="button" className="icon-btn ml-2" aria-label="Run now" title="Run now" onClick={() => runScheduleNow(s.id)}>
                  <Play className="h-4 w-4" />
                </button>
                <button type="button" className="icon-btn" aria-label="Edit schedule" title="Edit" onClick={() => actions.editSchedule(s)}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" className="icon-btn hover:text-danger" aria-label="Delete schedule" title="Delete" onClick={() => setConfirm(s)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Suggested automations
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {SUGGESTIONS.map((sug) => (
            <button
              key={sug.title}
              type="button"
              onClick={() => actions.editSchedule(undefined, sug.schedule)}
              className="card flex items-center gap-3 p-3 text-left transition-colors hover:border-accent/40 hover:bg-accent/[0.03]"
            >
              <IntegrationTile id={sug.schedule.destination!} />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{sug.title}</span>
                <span className="block text-xs text-muted">{sug.detail}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={confirm !== null}
        title="Delete this schedule?"
        message={confirm ? `${TEMPLATES[confirm.templateId].name} to ${INTEGRATIONS[confirm.destination].name} will stop running. Past exports stay in History.` : ""}
        confirmLabel="Delete schedule"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) {
            deleteSchedule(confirm.id);
            toast({ title: "Schedule deleted" });
          }
          setConfirm(null);
        }}
      />
    </div>
  );
}

// ---- History ----

function dayLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export function HistoryTab({ actions }: { actions: TabActions }) {
  const { state, clearHistory } = useCloud();
  const now = useNow();
  const [status, setStatus] = useState<"all" | "completed" | "failed" | "active">("all");
  const [destination, setDestination] = useState<IntegrationId | "all">("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const jobs = state.jobs.filter(
    (j) =>
      (destination === "all" || j.destination === destination) &&
      (status === "all" || (status === "active" ? j.status === "queued" || j.status === "running" : j.status === status)),
  );
  const groups = jobs.reduce<{ label: string; jobs: Job[] }[]>((acc, job) => {
    const label = dayLabel(job.createdAt, now);
    if (acc.at(-1)?.label === label) acc.at(-1)!.jobs.push(job);
    else acc.push({ label, jobs: [job] });
    return acc;
  }, []);

  if (state.jobs.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={HistoryIcon} title="No exports yet" description="Every export, scheduled run and live sync will be logged here with its status." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Filter by status" className="input w-auto py-1.5" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">All statuses</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="active">In progress</option>
        </select>
        <select aria-label="Filter by destination" className="input w-auto py-1.5" value={destination} onChange={(e) => setDestination(e.target.value as typeof destination)}>
          <option value="all">All destinations</option>
          {Object.values(INTEGRATIONS).map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <p className="ml-auto text-xs text-muted">
          {jobs.length} of {state.jobs.length}
        </p>
        <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => setConfirmClear(true)}>
          Clear history
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="card px-5 py-8 text-center text-sm text-muted">No exports match these filters.</p>
      ) : (
        groups.map((g) => (
          <section key={g.label}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</h2>
            <ul className="card divide-y divide-border">
              {g.jobs.map((job) => (
                <JobRow key={job.id} job={job} now={now} actions={actions} />
              ))}
            </ul>
          </section>
        ))
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear export history?"
        message="This removes the log of past exports from this browser. Files already delivered aren't affected."
        confirmLabel="Clear history"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clearHistory();
          setConfirmClear(false);
        }}
      />
    </div>
  );
}

// ---- Shared links ----

export function SharesTab({ actions }: { actions: TabActions }) {
  const { state, removeShare } = useCloud();
  const now = useNow();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [, copy] = useCopy();
  const [qrFor, setQrFor] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-2">Read-only links to a report. The data travels inside each link, so recipients don&apos;t need an account.</p>
        <button type="button" className="btn-primary shrink-0" onClick={() => actions.share({})}>
          <Link2 className="h-4 w-4" aria-hidden />
          Create link
        </button>
      </div>

      {state.shares.length === 0 ? (
        <div className="card">
          <EmptyState icon={Share2} title="No shared links yet" description="Share a summary with a partner, accountant or roommate as a link or QR code." />
        </div>
      ) : (
        <ul className="card divide-y divide-border">
          {state.shares.map((s) => {
            const Icon = TEMPLATES[s.templateId].icon;
            const expired = s.expiresAt !== null && new Date(s.expiresAt) <= now;
            return (
              <li key={s.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{s.title}</p>
                    <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                      <span>Created {formatRelative(s.createdAt, now)}</span>
                      <span aria-hidden>·</span>
                      {expired ? (
                        <span className="font-medium text-danger">Expired</span>
                      ) : (
                        <span>{s.expiresAt ? `Expires ${formatRelative(s.expiresAt, now)}` : "Never expires"}</span>
                      )}
                      {s.redacted && (
                        <>
                          <span aria-hidden>·</span>
                          <span>Descriptions hidden</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <button
                    type="button"
                    className="btn-ghost px-2.5 py-1 text-xs"
                    disabled={expired}
                    onClick={() => {
                      copy(s.url);
                      setCopiedId(s.id);
                      window.setTimeout(() => setCopiedId((c) => (c === s.id ? null : c)), 1800);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    {copiedId === s.id ? "Copied" : "Copy"}
                  </button>
                  <button type="button" className="icon-btn" aria-label="Show QR code" title="QR code" disabled={expired} onClick={() => setQrFor(s.url)}>
                    <QrCode className="h-4 w-4" />
                  </button>
                  <a href={s.url} target="_blank" rel="noreferrer" className="icon-btn" aria-label="Open shared view" title="Open">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button type="button" className="icon-btn hover:text-danger" aria-label="Remove from list" title="Remove from list" onClick={() => removeShare(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={qrFor !== null} onClose={() => setQrFor(null)} title="Scan to open" description="Point a phone camera at the code." size="sm">
        {qrFor && <ShareQr url={qrFor} />}
      </Modal>
    </div>
  );
}

export function useTabCounts() {
  const { state } = useCloud();
  return {
    overview: null,
    integrations: state.connections.length || null,
    schedules: state.schedules.length || null,
    history: state.jobs.length || null,
    shares: state.shares.length || null,
  } satisfies Record<TabId, number | null>;
}
