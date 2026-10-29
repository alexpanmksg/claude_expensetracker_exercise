"use client";

import { Cloud, CloudAlert, CloudOff, CloudUpload, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCloud, type SyncStatus } from "@/components/providers/CloudProvider";
import { INTEGRATIONS } from "@/lib/cloud/integrations";
import { formatRelative } from "@/lib/cloud/time";
import { useNow } from "./ui";

export function describeSync(status: SyncStatus, now: Date): { label: string; detail: string; tone: "ok" | "warn" | "bad" | "busy" | "idle" } {
  switch (status.kind) {
    case "empty":
      return { label: "Nothing to back up", detail: "Add expenses to start backing up.", tone: "idle" };
    case "never":
      return { label: "Not backed up", detail: `${status.pending} expenses exist only in this browser.`, tone: "warn" };
    case "syncing":
      return { label: "Syncing…", detail: "A backup is running in the background.", tone: "busy" };
    case "failed":
      return { label: "Backup failed", detail: status.error, tone: "bad" };
    case "unsynced":
      return {
        label: `${status.pending} unsynced ${status.pending === 1 ? "change" : "changes"}`,
        detail: `Last backup ${formatRelative(status.at, now)}.`,
        tone: "warn",
      };
    case "synced":
      return {
        label: `Backed up ${formatRelative(status.at, now)}`,
        detail: status.destination ? `Latest copy: ${INTEGRATIONS[status.destination].name}.` : "Everything is backed up.",
        tone: "ok",
      };
  }
}

const ICONS = { ok: Cloud, warn: CloudUpload, bad: CloudAlert, busy: Loader2, idle: CloudOff };
const TONES = { ok: "text-success", warn: "text-ink-2", bad: "text-danger", busy: "text-accent", idle: "text-muted" };

/** Header pill showing whether the data is backed up, linking to the export hub. */
export function SyncIndicator() {
  const { syncStatus, isLoaded } = useCloud();
  const now = useNow();
  if (!isLoaded) return null;
  const { label, detail, tone } = describeSync(syncStatus, now);
  const Icon = ICONS[tone];
  return (
    <Link
      href="/exports"
      title={detail}
      aria-label={`${label}. ${detail} Open exports.`}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <span className="relative">
        <Icon className={`h-4 w-4 ${TONES[tone]} ${tone === "busy" ? "animate-spin" : ""}`} aria-hidden />
        {tone === "warn" && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
      </span>
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}
