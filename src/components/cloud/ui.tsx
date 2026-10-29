"use client";

import { AlertCircle, CheckCircle2, Clock, FlaskConical, Loader2 } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { INTEGRATIONS } from "@/lib/cloud/integrations";
import type { IntegrationId, JobStatus } from "@/lib/cloud/types";

/** The current time, refreshed on an interval so relative times ("3 minutes ago") stay current. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

export function IntegrationTile({ id, size = "md", active = false }: { id: IntegrationId; size?: "sm" | "md" | "lg"; active?: boolean }) {
  const Icon = INTEGRATIONS[id].icon;
  const box = size === "sm" ? "h-7 w-7 rounded-md" : size === "lg" ? "h-11 w-11 rounded-xl" : "h-9 w-9 rounded-lg";
  const glyph = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span
      className={`flex shrink-0 items-center justify-center border ${box} ${
        active ? "border-accent/30 bg-accent/10 text-accent" : "border-border bg-surface-2 text-ink-2"
      }`}
    >
      <Icon className={glyph} aria-hidden />
    </span>
  );
}

/** Marks integrations that only simulate the real service, so nobody mistakes the demo for a live upload. */
export function SimulatedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted"
      title="This integration is simulated. Nothing leaves your browser."
    >
      <FlaskConical className="h-2.5 w-2.5" aria-hidden />
      Simulated
    </span>
  );
}

const STATUS: Record<JobStatus, { label: string; icon: typeof Clock; className: string }> = {
  queued: { label: "Queued", icon: Clock, className: "bg-surface-2 text-ink-2" },
  running: { label: "In progress", icon: Loader2, className: "bg-accent/10 text-accent" },
  completed: { label: "Done", icon: CheckCircle2, className: "bg-success/10 text-success" },
  failed: { label: "Failed", icon: AlertCircle, className: "bg-danger/10 text-danger" },
};

export function StatusChip({ status, label }: { status: JobStatus; label?: string }) {
  const { label: fallback, icon: Icon, className } = STATUS[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      <Icon className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} aria-hidden />
      {label ?? fallback}
    </span>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 ${
        checked ? "bg-accent" : "bg-baseline"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-surface shadow-card transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
      {options.map((o) => (
        <label
          key={o.value}
          className={`cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40 ${
            value === o.value ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:text-ink"
          }`}
        >
          <input type="radio" name={name} className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor?: string; error?: string | null; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
