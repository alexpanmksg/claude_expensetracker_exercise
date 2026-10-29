import { Cloud, Download, FolderOpen, HardDrive, Hash, Mail, Sheet, type LucideIcon } from "lucide-react";
import type { IntegrationId, JobTarget, Report } from "./types";

export type IntegrationGroup = "Built in" | "Spreadsheets" | "Cloud storage" | "Messaging";

export interface IntegrationSpec {
  id: IntegrationId;
  name: string;
  group: IntegrationGroup;
  icon: LucideIcon;
  description: string;
  /** The account provider shown in the simulated sign-in; absent for built-in destinations. */
  provider?: string;
  /** What the simulated consent screen says Tally may do. */
  permissions: string[];
  /** Progress labels for a delivery, in order. The last one is the finished state. */
  steps: string[];
  /** Past tense for history and toasts: "Uploaded to Dropbox". */
  delivered: string;
  /** Can run unattended on a schedule (a download needs someone at the keyboard). */
  schedulable: boolean;
  liveSync?: boolean;
}

const storage = (id: IntegrationId, name: string, provider: string, icon: LucideIcon, description: string): IntegrationSpec => ({
  id,
  name,
  group: "Cloud storage",
  icon,
  description,
  provider,
  permissions: [`Create files in a "Tally" folder in your ${name}`, "See only the files Tally creates"],
  steps: ["Queued", "Building file", `Uploading to ${name}`, "Saved"],
  delivered: `Saved to ${name}`,
  schedulable: true,
});

export const INTEGRATIONS: Record<IntegrationId, IntegrationSpec> = {
  download: {
    id: "download",
    name: "Download",
    group: "Built in",
    icon: Download,
    description: "Save a CSV or JSON file to this device.",
    permissions: [],
    steps: ["Queued", "Building file", "Saving to this device", "Downloaded"],
    delivered: "Downloaded",
    schedulable: false,
  },
  email: {
    id: "email",
    name: "Email",
    group: "Built in",
    icon: Mail,
    description: "Send the report as an attachment, with a summary in the message.",
    permissions: [],
    steps: ["Queued", "Building attachment", "Sending email", "Delivered"],
    delivered: "Emailed",
    schedulable: true,
  },
  "google-sheets": {
    id: "google-sheets",
    name: "Google Sheets",
    group: "Spreadsheets",
    icon: Sheet,
    description: "Write each section to its own tab, or keep a spreadsheet in live sync.",
    provider: "Google",
    permissions: ["Create spreadsheets in your Google Drive", "Edit only the spreadsheets Tally creates"],
    steps: ["Queued", "Building rows", "Writing to Google Sheets", "Synced"],
    delivered: "Written to Google Sheets",
    schedulable: true,
    liveSync: true,
  },
  "google-drive": storage("google-drive", "Google Drive", "Google", HardDrive, "Keep dated report files in a Drive folder."),
  dropbox: storage("dropbox", "Dropbox", "Dropbox", FolderOpen, "Drop report files into a Dropbox folder."),
  onedrive: storage("onedrive", "OneDrive", "Microsoft", Cloud, "Store report files in your OneDrive."),
  slack: {
    id: "slack",
    name: "Slack",
    group: "Messaging",
    icon: Hash,
    description: "Post a digest with highlights to a channel, with the file attached.",
    provider: "Slack",
    permissions: ["Post messages as Tally in channels you choose", "Upload files to those channels"],
    steps: ["Queued", "Writing the digest", "Posting to Slack", "Posted"],
    delivered: "Posted to Slack",
    schedulable: true,
  },
};

export const INTEGRATION_GROUPS: IntegrationGroup[] = ["Built in", "Spreadsheets", "Cloud storage", "Messaging"];

export const needsConnection = (id: IntegrationId) => INTEGRATIONS[id].provider !== undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (value: string) => EMAIL.test(value.trim());

/** Sensible defaults for a destination's fields. */
export function defaultTarget(id: IntegrationId, report: Pick<Report, "title">): JobTarget {
  switch (id) {
    case "email":
      return { recipients: [], subject: report.title, message: "Here's the latest from Tally. The full report is attached." };
    case "google-sheets":
      return { spreadsheet: "Tally expenses" };
    case "google-drive":
    case "dropbox":
    case "onedrive":
      return { folder: "/Apps/Tally/Reports" };
    case "slack":
      return { channel: "#finance" };
    default:
      return {};
  }
}

/** Returns what's wrong with the destination's fields, or null. */
export function validateTarget(id: IntegrationId, target: JobTarget): string | null {
  switch (id) {
    case "email":
      if (!target.recipients?.length) return "Add at least one recipient.";
      if (target.recipients.some((r) => !isEmail(r))) return "One of the email addresses doesn't look right.";
      if (!target.subject?.trim()) return "Add a subject.";
      return null;
    case "google-sheets":
      return target.spreadsheet?.trim() ? null : "Name the spreadsheet.";
    case "google-drive":
    case "dropbox":
    case "onedrive":
      return target.folder?.trim().startsWith("/") ? null : "Folder paths start with /.";
    case "slack":
      return /^#[a-z0-9][a-z0-9_-]*$/.test(target.channel?.trim() ?? "") ? null : "Channels look like #finance (lowercase, no spaces).";
    default:
      return null;
  }
}

/** "to alex@example.com", "in /Apps/Tally", "in #finance": the where, for history rows. */
export function describeTarget(id: IntegrationId, target: JobTarget): string {
  if (id === "email") {
    const [first, ...rest] = target.recipients ?? [];
    return first ? `to ${first}${rest.length ? ` +${rest.length}` : ""}` : "";
  }
  if (id === "google-sheets") return target.spreadsheet ? `in “${target.spreadsheet}”` : "";
  if (id === "slack") return target.channel ? `in ${target.channel}` : "";
  if (target.folder) return `in ${target.folder}`;
  return "";
}
