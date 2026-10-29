"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCloud } from "@/components/providers/CloudProvider";
import { describeTarget, INTEGRATIONS } from "@/lib/cloud/integrations";
import { TEMPLATES } from "@/lib/cloud/templates";
import { IntegrationTile, StatusChip, useNow } from "./ui";

/** How long finished jobs stay in the tray before it tidies them away. */
const LINGER_MS = 6000;

/** Background work in the bottom-left corner, like an upload panel. */
export function ActivityTray() {
  const { state, progress } = useCloud();
  const pathname = usePathname();
  const now = useNow(1000);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = state.jobs.filter(
    (j) =>
      !dismissed.has(j.id) &&
      (j.status === "queued" || j.status === "running" || (j.finishedAt && now.getTime() - new Date(j.finishedAt).getTime() < LINGER_MS)),
  );
  const running = visible.filter((j) => j.status === "queued" || j.status === "running").length;

  // New work re-opens a collapsed tray.
  useEffect(() => {
    if (running > 0) setCollapsed(false);
  }, [running]);

  if (visible.length === 0 || pathname.startsWith("/shared")) return null;

  return (
    <section
      aria-label="Export activity"
      className="fixed bottom-4 left-4 right-4 z-40 animate-slide-up overflow-hidden rounded-xl border border-border bg-surface shadow-pop sm:right-auto sm:w-80"
    >
      <header className="flex items-center gap-2 border-b border-border bg-surface-2/60 px-3 py-2">
        <p className="flex-1 text-sm font-medium text-ink" aria-live="polite">
          {running > 0 ? `${running} ${running === 1 ? "export" : "exports"} in progress` : "Exports finished"}
        </p>
        <button type="button" className="icon-btn h-7 w-7" aria-label={collapsed ? "Expand" : "Collapse"} onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {running === 0 && (
          <button type="button" className="icon-btn h-7 w-7" aria-label="Close" onClick={() => setDismissed(new Set(state.jobs.map((j) => j.id)))}>
            <X className="h-4 w-4" />
          </button>
        )}
      </header>
      {!collapsed && (
        <ul className="max-h-72 divide-y divide-border overflow-y-auto">
          {visible.map((job) => {
            const spec = INTEGRATIONS[job.destination];
            const pct = job.status === "completed" ? 1 : (progress[job.id] ?? job.step / (spec.steps.length - 1));
            const stepLabel = job.status === "failed" ? job.error : spec.steps[job.step];
            return (
              <li key={job.id} className="px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <IntegrationTile id={job.destination} size="sm" active={job.status !== "failed"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {TEMPLATES[job.templateId].name}
                      <span className="font-normal text-muted"> → {spec.name}</span>
                    </p>
                    <p className={`truncate text-xs ${job.status === "failed" ? "text-danger" : "text-ink-2"}`}>
                      {stepLabel}
                      {job.status === "running" && job.step === 2 ? ` ${describeTarget(job.destination, job.target)}` : ""}
                    </p>
                  </div>
                  {(job.status === "completed" || job.status === "failed") && <StatusChip status={job.status} />}
                </div>
                {(job.status === "queued" || job.status === "running") && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${TEMPLATES[job.templateId].name} progress`}>
                    <div className="h-full rounded-full bg-accent transition-[width] duration-150 ease-linear" style={{ width: `${Math.max(pct, 0.04) * 100}%` }} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
