"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityTray } from "@/components/cloud/ActivityTray";
import { INTEGRATIONS, needsConnection } from "@/lib/cloud/integrations";
import { downloadBlob, reportFile } from "@/lib/cloud/render";
import { nextRunAt } from "@/lib/cloud/schedule";
import { encodeShare, redactReport, shareUrl } from "@/lib/cloud/share";
import { CLOUD_STORAGE_KEY, EMPTY_CLOUD_STATE, loadCloudState, MAX_HISTORY, saveCloudState } from "@/lib/cloud/storage";
import { buildReport, TEMPLATES } from "@/lib/cloud/templates";
import { newId } from "@/lib/cloud/time";
import type {
  CloudState,
  DateRange,
  ExportFormat,
  IntegrationId,
  Job,
  JobTarget,
  JobTrigger,
  Schedule,
  ShareLink,
  TemplateId,
} from "@/lib/cloud/types";
import type { Expense } from "@/lib/types";
import { useExpenses } from "./ExpensesProvider";
import { useToast } from "./ToastProvider";

export interface ExportRequest {
  templateId: TemplateId;
  destination: IntegrationId;
  format: ExportFormat;
  target: JobTarget;
  range?: DateRange;
  trigger?: JobTrigger;
  scheduleId?: string;
}

export type ScheduleInput = Omit<Schedule, "id" | "nextRunAt" | "createdAt" | "lastRunAt" | "lastStatus"> & { id?: string };

export type SyncStatus =
  | { kind: "empty" }
  | { kind: "never"; pending: number }
  | { kind: "syncing" }
  | { kind: "failed"; error: string }
  | { kind: "unsynced"; pending: number; at: string }
  | { kind: "synced"; at: string; destination: IntegrationId | null };

interface CloudContextValue {
  isLoaded: boolean;
  state: CloudState;
  /** 0–1 for jobs that are still running. */
  progress: Record<string, number>;
  syncStatus: SyncStatus;
  connect: (id: IntegrationId, account: string) => void;
  disconnect: (id: IntegrationId) => void;
  setLiveSync: (id: IntegrationId, spreadsheet: string | null) => void;
  startExport: (request: ExportRequest) => Job;
  retry: (jobId: string) => void;
  downloadCopy: (job: Job) => void;
  clearHistory: () => void;
  saveSchedule: (input: ScheduleInput) => Schedule;
  deleteSchedule: (id: string) => void;
  setSchedulePaused: (id: string, paused: boolean) => void;
  runScheduleNow: (id: string) => void;
  createShare: (options: { templateId: TemplateId; range?: DateRange; expiresInMs: number | null; redact: boolean }) => Promise<ShareLink>;
  removeShare: (id: string) => void;
}

const CloudContext = createContext<CloudContextValue | null>(null);

// Simulated time each step takes: queued, building, delivering. Downloads are near-instant.
const STEP_MS = [450, 900, 1600];
const DOWNLOAD_STEP_MS = [150, 300, 300];
const TICK_MS = 120;
const SCHEDULER_MS = 30_000;
const LIVE_SYNC_DEBOUNCE_MS = 3000;

const isActive = (j: Job) => j.status === "queued" || j.status === "running";
const isBackupJob = (j: Job) => j.templateId === "full-backup" || j.trigger === "live-sync";

/** How many expenses were added, removed or edited between two lists. */
function countChanges(prev: Expense[], next: Expense[]): number {
  const before = new Map(prev.map((e) => [e.id, e.updatedAt]));
  let changes = 0;
  for (const e of next) {
    const was = before.get(e.id);
    if (was === undefined || was !== e.updatedAt) changes++;
    before.delete(e.id);
  }
  return changes + before.size;
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const { expenses, isLoaded: expensesLoaded } = useExpenses();
  const toast = useToast();
  const [state, setState] = useState<CloudState>(EMPTY_CLOUD_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  // Same pattern as ExpensesProvider: actions read the latest state synchronously, persist, then render.
  const latest = useRef<CloudState>(EMPTY_CLOUD_STATE);
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;
  const stepStartedAt = useRef(new Map<string, number>());

  /** User actions pass strict, so a failed write throws and nothing changes. Background work keeps going in memory. */
  const commit = useCallback((next: CloudState, strict = false) => {
    try {
      saveCloudState(next);
    } catch (err) {
      if (strict) throw err;
    }
    latest.current = next;
    setState(next);
  }, []);
  const update = useCallback(
    (fn: (s: CloudState) => CloudState, strict = false) => commit(fn(latest.current), strict),
    [commit],
  );

  useEffect(() => {
    const loaded = loadCloudState();
    latest.current = loaded;
    setState(loaded);
    setIsLoaded(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CLOUD_STORAGE_KEY) return;
      latest.current = loadCloudState();
      setState(latest.current);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const patchJob = useCallback(
    (id: string, patch: Partial<Job>) => update((s) => ({ ...s, jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),
    [update],
  );

  const enqueue = useCallback(
    (request: ExportRequest, strict = true): Job => {
      const now = new Date();
      const range = request.range ?? TEMPLATES[request.templateId].defaultRange(now);
      const job: Job = {
        id: newId(),
        templateId: request.templateId,
        destination: request.destination,
        format: request.format,
        range,
        trigger: request.trigger ?? "manual",
        status: "queued",
        step: 0,
        filename: "",
        records: 0,
        bytes: 0,
        target: request.target,
        scheduleId: request.scheduleId,
        createdAt: now.toISOString(),
      };
      update((s) => ({ ...s, jobs: [job, ...s.jobs].slice(0, MAX_HISTORY) }), strict);
      return job;
    },
    [update],
  );

  // ---- Job runner: walks each job through its destination's steps on a timer. ----

  const finish = useCallback(
    (job: Job, outcome: { ok: true } | { ok: false; error: string }) => {
      const at = new Date().toISOString();
      update((s) => ({
        ...s,
        jobs: s.jobs.map((j) =>
          j.id === job.id
            ? { ...j, status: outcome.ok ? "completed" : "failed", step: outcome.ok ? INTEGRATIONS[j.destination].steps.length - 1 : j.step, error: outcome.ok ? undefined : outcome.error, finishedAt: at }
            : j,
        ),
        schedules: s.schedules.map((sc) => (sc.id === job.scheduleId ? { ...sc, lastStatus: outcome.ok ? "completed" : "failed" } : sc)),
        connections: outcome.ok ? s.connections.map((c) => (c.id === job.destination ? { ...c, lastDeliveryAt: at } : c)) : s.connections,
        backup: outcome.ok && isBackupJob(job) ? { at, destination: job.destination, pending: 0 } : s.backup,
      }));
      if (job.trigger === "live-sync" && outcome.ok) return;
      const spec = INTEGRATIONS[job.destination];
      const name = TEMPLATES[job.templateId].name;
      if (outcome.ok) {
        toast({ title: spec.delivered, description: job.trigger === "schedule" ? `${name} · ran on schedule in the background` : name });
      } else {
        toast({ variant: "error", title: `${name} export failed`, description: outcome.error, action: { label: "Retry", onClick: () => retryRef.current(job.id) } });
      }
    },
    [toast, update],
  );

  const advance = useCallback(
    (job: Job) => {
      if (job.step === 0) {
        patchJob(job.id, { status: "running", step: 1 });
        return;
      }
      if (job.step === 1) {
        const spec = INTEGRATIONS[job.destination];
        if (needsConnection(job.destination) && !latest.current.connections.some((c) => c.id === job.destination)) {
          finish(job, { ok: false, error: `${spec.name} is disconnected. Reconnect it to resume.` });
          return;
        }
        // Build the real file so history shows true sizes and record counts.
        const report = buildReport(expensesRef.current, job.templateId, job.range);
        const { blob, filename } = reportFile(report, job.format);
        patchJob(job.id, { step: 2, records: report.records, bytes: blob.size, filename });
        return;
      }
      finish(job, { ok: true });
    },
    [finish, patchJob],
  );

  const hasActive = state.jobs.some(isActive);
  useEffect(() => {
    if (!hasActive) return;
    const timer = window.setInterval(() => {
      const now = performance.now();
      const next: Record<string, number> = {};
      for (const job of latest.current.jobs.filter(isActive)) {
        const started = stepStartedAt.current.get(`${job.id}:${job.step}`) ?? now;
        stepStartedAt.current.set(`${job.id}:${job.step}`, started);
        const durations = job.destination === "download" ? DOWNLOAD_STEP_MS : STEP_MS;
        const fraction = Math.min((now - started) / durations[job.step], 1);
        next[job.id] = (job.step + fraction) / (INTEGRATIONS[job.destination].steps.length - 1);
        if (fraction >= 1) advance(job);
      }
      setProgress(next);
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [hasActive, advance]);

  // ---- Public actions ----

  const startExport = useCallback(
    (request: ExportRequest) => {
      if (request.destination === "download") {
        // Download during the click itself; browsers block downloads that start later.
        const report = buildReport(expensesRef.current, request.templateId, request.range);
        const { blob, filename } = reportFile(report, request.format);
        downloadBlob(blob, filename);
      }
      return enqueue(request);
    },
    [enqueue],
  );

  const retry = useCallback(
    (jobId: string) => {
      const failed = latest.current.jobs.find((j) => j.id === jobId);
      if (!failed) return;
      startExport({ ...failed, trigger: failed.trigger === "live-sync" ? "live-sync" : "manual" });
    },
    [startExport],
  );
  const retryRef = useRef(retry);
  retryRef.current = retry;

  const downloadCopy = useCallback((job: Job) => {
    const { blob, filename } = reportFile(buildReport(expensesRef.current, job.templateId, job.range), job.format);
    downloadBlob(blob, filename);
  }, []);

  const connect = useCallback(
    (id: IntegrationId, account: string) =>
      update(
        (s) => ({
          ...s,
          connections: [...s.connections.filter((c) => c.id !== id), { id, account, connectedAt: new Date().toISOString() }],
        }),
        true,
      ),
    [update],
  );

  const disconnect = useCallback(
    (id: IntegrationId) => update((s) => ({ ...s, connections: s.connections.filter((c) => c.id !== id) }), true),
    [update],
  );

  const setLiveSync = useCallback(
    (id: IntegrationId, spreadsheet: string | null) =>
      update(
        (s) => ({ ...s, connections: s.connections.map((c) => (c.id === id ? { ...c, liveSync: spreadsheet ? { spreadsheet } : null } : c)) }),
        true,
      ),
    [update],
  );

  const saveSchedule = useCallback(
    (input: ScheduleInput) => {
      const existing = input.id ? latest.current.schedules.find((s) => s.id === input.id) : undefined;
      const schedule: Schedule = {
        ...existing,
        ...input,
        id: existing?.id ?? newId(),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        nextRunAt: nextRunAt(input, new Date()).toISOString(),
      };
      update((s) => ({ ...s, schedules: existing ? s.schedules.map((x) => (x.id === schedule.id ? schedule : x)) : [...s.schedules, schedule] }), true);
      return schedule;
    },
    [update],
  );

  const deleteSchedule = useCallback(
    (id: string) => update((s) => ({ ...s, schedules: s.schedules.filter((x) => x.id !== id) }), true),
    [update],
  );

  const setSchedulePaused = useCallback(
    (id: string, paused: boolean) =>
      update(
        (s) => ({
          ...s,
          // Resuming recalculates the next run so a long pause doesn't fire a stale one immediately.
          schedules: s.schedules.map((x) => (x.id === id ? { ...x, paused, nextRunAt: paused ? x.nextRunAt : nextRunAt(x, new Date()).toISOString() } : x)),
        }),
        true,
      ),
    [update],
  );

  const runSchedule = useCallback(
    (schedule: Schedule, now: Date, strict: boolean) => {
      enqueue({ ...schedule, trigger: "schedule", scheduleId: schedule.id }, strict);
      update((s) => ({ ...s, schedules: s.schedules.map((x) => (x.id === schedule.id ? { ...x, lastRunAt: now.toISOString() } : x)) }), strict);
    },
    [enqueue, update],
  );

  const runScheduleNow = useCallback(
    (id: string) => {
      const schedule = latest.current.schedules.find((s) => s.id === id);
      if (schedule) runSchedule(schedule, new Date(), true);
    },
    [runSchedule],
  );

  const createShare = useCallback(
    async ({ templateId, range, expiresInMs, redact }: { templateId: TemplateId; range?: DateRange; expiresInMs: number | null; redact: boolean }) => {
      const now = new Date();
      const report = buildReport(expensesRef.current, templateId, range, now);
      const payload = {
        v: 1 as const,
        report: redact ? redactReport(report) : report,
        createdAt: now.toISOString(),
        expiresAt: expiresInMs === null ? null : new Date(now.getTime() + expiresInMs).toISOString(),
      };
      const link: ShareLink = {
        id: newId(),
        templateId,
        title: report.title,
        url: shareUrl(window.location.origin, await encodeShare(payload)),
        createdAt: payload.createdAt,
        expiresAt: payload.expiresAt,
        redacted: redact,
      };
      update((s) => ({ ...s, shares: [link, ...s.shares] }), true);
      return link;
    },
    [update],
  );

  const removeShare = useCallback((id: string) => update((s) => ({ ...s, shares: s.shares.filter((x) => x.id !== id) }), true), [update]);
  const clearHistory = useCallback(() => update((s) => ({ ...s, jobs: s.jobs.filter(isActive) }), true), [update]);

  // ---- Scheduler: runs due schedules while the app is open, and catches up once on load. ----

  useEffect(() => {
    if (!isLoaded || !expensesLoaded) return;
    const check = () => {
      const now = new Date();
      for (const schedule of latest.current.schedules) {
        if (schedule.paused || new Date(schedule.nextRunAt) > now) continue;
        // Missed runs collapse into one: the next run is computed from now, not from the missed time.
        update((s) => ({ ...s, schedules: s.schedules.map((x) => (x.id === schedule.id ? { ...x, nextRunAt: nextRunAt(x, now).toISOString() } : x)) }));
        runSchedule(schedule, now, false);
      }
    };
    check();
    const timer = window.setInterval(check, SCHEDULER_MS);
    return () => window.clearInterval(timer);
  }, [isLoaded, expensesLoaded, runSchedule, update]);

  // ---- Change tracking and live sync ----

  const previousExpenses = useRef<Expense[] | null>(null);
  const liveSyncTimer = useRef<number>();
  useEffect(() => {
    if (!isLoaded || !expensesLoaded) return;
    const prev = previousExpenses.current;
    previousExpenses.current = expenses;
    // The first list is what was loaded, not a change; hidden tabs see other tabs' edits, which they already counted.
    if (prev === null || prev === expenses || document.hidden) return;
    const changes = countChanges(prev, expenses);
    if (changes === 0) return;
    update((s) => ({ ...s, backup: { ...s.backup, pending: s.backup.pending + changes } }));

    const synced = latest.current.connections.find((c) => c.liveSync);
    if (!synced?.liveSync) return;
    window.clearTimeout(liveSyncTimer.current);
    const spreadsheet = synced.liveSync.spreadsheet;
    liveSyncTimer.current = window.setTimeout(() => {
      enqueue({ templateId: "full-backup", destination: synced.id, format: "csv", target: { spreadsheet }, trigger: "live-sync" }, false);
    }, LIVE_SYNC_DEBOUNCE_MS);
  }, [expenses, isLoaded, expensesLoaded, enqueue, update]);
  useEffect(() => () => window.clearTimeout(liveSyncTimer.current), []);

  const syncStatus = useMemo<SyncStatus>(() => {
    const { jobs, backup } = state;
    if (jobs.some((j) => isActive(j) && isBackupJob(j))) return { kind: "syncing" };
    const last = jobs.find((j) => isBackupJob(j) && !isActive(j));
    if (last?.status === "failed") return { kind: "failed", error: last.error ?? "The last backup failed." };
    if (!backup.at) return expenses.length === 0 ? { kind: "empty" } : { kind: "never", pending: expenses.length };
    if (backup.pending > 0) return { kind: "unsynced", pending: backup.pending, at: backup.at };
    return { kind: "synced", at: backup.at, destination: backup.destination };
  }, [state, expenses.length]);

  const value = useMemo<CloudContextValue>(
    () => ({
      isLoaded,
      state,
      progress,
      syncStatus,
      connect,
      disconnect,
      setLiveSync,
      startExport,
      retry,
      downloadCopy,
      clearHistory,
      saveSchedule,
      deleteSchedule,
      setSchedulePaused,
      runScheduleNow,
      createShare,
      removeShare,
    }),
    [isLoaded, state, progress, syncStatus, connect, disconnect, setLiveSync, startExport, retry, downloadCopy, clearHistory, saveSchedule, deleteSchedule, setSchedulePaused, runScheduleNow, createShare, removeShare],
  );

  return (
    <CloudContext.Provider value={value}>
      {children}
      <ActivityTray />
    </CloudContext.Provider>
  );
}

export function useCloud(): CloudContextValue {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error("useCloud must be used inside <CloudProvider>");
  return ctx;
}
