export const INTEGRATION_IDS = ["download", "email", "google-sheets", "google-drive", "dropbox", "onedrive", "slack"] as const;
export type IntegrationId = (typeof INTEGRATION_IDS)[number];

export const TEMPLATE_IDS = ["monthly-summary", "tax-report", "category-analysis", "full-backup"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export type ExportFormat = "csv" | "json";
export type JobTrigger = "manual" | "schedule" | "live-sync";
export type JobStatus = "queued" | "running" | "completed" | "failed";

/** Inclusive YYYY-MM-DD bounds; "" means unbounded. */
export interface DateRange {
  from: string;
  to: string;
}

/** How a cell is stored and shown: money is dollars, percent is a 0–1 ratio, date is YYYY-MM-DD. */
export type ColumnKind = "text" | "money" | "number" | "percent" | "date" | "category" | "trend";

export interface ReportColumn {
  label: string;
  kind: ColumnKind;
}

export interface ReportSection {
  title: string;
  columns: ReportColumn[];
  rows: (string | number | null)[][];
  note?: string;
}

export interface ReportStat {
  label: string;
  value: string;
  hint?: string;
}

/** A template's output: plain data, so it can be rendered, serialized into a share link or turned into files. */
export interface Report {
  templateId: TemplateId;
  title: string;
  subtitle: string;
  range: DateRange;
  generatedAt: string;
  records: number;
  stats: ReportStat[];
  highlights: string[];
  sections: ReportSection[];
  disclaimer?: string;
  /** Set when descriptions were stripped before sharing. */
  redacted?: boolean;
}

/** Where a delivery goes. Only the fields the destination uses are set. */
export interface JobTarget {
  recipients?: string[];
  subject?: string;
  message?: string;
  spreadsheet?: string;
  folder?: string;
  channel?: string;
}

export interface Job {
  id: string;
  templateId: TemplateId;
  destination: IntegrationId;
  format: ExportFormat;
  range: DateRange;
  trigger: JobTrigger;
  status: JobStatus;
  /** Index into the destination's steps. */
  step: number;
  filename: string;
  records: number;
  bytes: number;
  target: JobTarget;
  scheduleId?: string;
  error?: string;
  createdAt: string;
  finishedAt?: string;
}

export interface Connection {
  id: IntegrationId;
  account: string;
  connectedAt: string;
  /** Google Sheets only: mirror every change into this spreadsheet. */
  liveSync?: { spreadsheet: string } | null;
  lastDeliveryAt?: string;
}

export type Frequency = "daily" | "weekly" | "monthly";

export interface Schedule {
  id: string;
  templateId: TemplateId;
  destination: IntegrationId;
  format: ExportFormat;
  target: JobTarget;
  frequency: Frequency;
  /** 0 = Sunday, for weekly schedules. */
  weekday: number;
  /** 1–31 for monthly schedules; short months use their last day. */
  monthDay: number;
  /** Local time, HH:MM. */
  time: string;
  paused: boolean;
  nextRunAt: string;
  lastRunAt?: string;
  lastStatus?: "completed" | "failed";
  createdAt: string;
}

export interface ShareLink {
  id: string;
  templateId: TemplateId;
  title: string;
  url: string;
  createdAt: string;
  expiresAt: string | null;
  redacted: boolean;
}

export interface BackupState {
  /** Last time a full backup or live sync completed. */
  at: string | null;
  destination: IntegrationId | null;
  /** Expense changes since then. */
  pending: number;
}

export interface CloudState {
  version: 1;
  connections: Connection[];
  schedules: Schedule[];
  jobs: Job[];
  shares: ShareLink[];
  backup: BackupState;
}
