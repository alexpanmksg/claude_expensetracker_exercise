"use client";

import { AlertTriangle, CalendarClock } from "lucide-react";
import { useId, useState } from "react";
import { useCloud } from "@/components/providers/CloudProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { Modal } from "@/components/ui/Modal";
import { defaultTarget, INTEGRATIONS, needsConnection, validateTarget } from "@/lib/cloud/integrations";
import { describeSchedule, nextRunAt, WEEKDAYS } from "@/lib/cloud/schedule";
import { TEMPLATES } from "@/lib/cloud/templates";
import { formatRunTime } from "@/lib/cloud/time";
import { INTEGRATION_IDS, TEMPLATE_IDS, type ExportFormat, type Frequency, type IntegrationId, type JobTarget, type Schedule, type TemplateId } from "@/lib/cloud/types";
import { Field, Segmented } from "./ui";

const SCHEDULABLE = INTEGRATION_IDS.filter((id) => INTEGRATIONS[id].schedulable);

/** Edits `schedule`, or creates a new one starting from `initial` (used by the suggested automations). */
export function ScheduleEditor({ schedule, initial, onClose }: { schedule?: Schedule; initial?: Partial<Schedule>; onClose: () => void }) {
  const { state, saveSchedule } = useCloud();
  const src = schedule ?? initial;
  const toast = useToast();
  const [templateId, setTemplateId] = useState<TemplateId>(src?.templateId ?? "full-backup");
  const [destination, setDestination] = useState<IntegrationId>(
    src?.destination ?? state.connections.find((c) => INTEGRATIONS[c.id].schedulable)?.id ?? "email",
  );
  const [format, setFormat] = useState<ExportFormat>(src?.format ?? TEMPLATES[src?.templateId ?? "full-backup"].defaultFormat);
  const [frequency, setFrequency] = useState<Frequency>(src?.frequency ?? "weekly");
  const [weekday, setWeekday] = useState(src?.weekday ?? 1);
  const [monthDay, setMonthDay] = useState(src?.monthDay ?? 1);
  const [time, setTime] = useState(src?.time ?? "09:00");
  const [targets, setTargets] = useState<Partial<Record<IntegrationId, JobTarget>>>(src?.destination && src.target ? { [src.destination]: src.target } : {});
  const [recipients, setRecipients] = useState(src?.target?.recipients?.join(", ") ?? "");
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const base = targets[destination] ?? defaultTarget(destination, { title: `${TEMPLATES[templateId].name} (scheduled)` });
  const target: JobTarget =
    destination === "email" ? { ...base, recipients: recipients.split(/[,\s]+/).filter(Boolean) } : base;
  const setTarget = (patch: Partial<JobTarget>) => setTargets((t) => ({ ...t, [destination]: { ...base, ...patch } }));
  const disconnected = needsConnection(destination) && !state.connections.some((c) => c.id === destination);
  const timing = { frequency, weekday, monthDay, time };
  const validTime = /^\d{2}:\d{2}$/.test(time);

  const save = () => {
    const problem = validTime ? validateTarget(destination, target) : "Pick a time.";
    if (problem) {
      setError(problem);
      return;
    }
    try {
      saveSchedule({ id: schedule?.id, templateId, destination, format, target, ...timing, paused: schedule?.paused ?? false });
      toast({ title: schedule ? "Schedule updated" : "Schedule created", description: describeSchedule(timing) });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={schedule ? "Edit schedule" : "New schedule"}
      description="Exports run in the background while Tally is open, and catch up when you come back."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={save}>
            {schedule ? "Save changes" : "Create schedule"}
          </button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Template" htmlFor={`${id}-template`}>
          <select
            id={`${id}-template`}
            className="input"
            value={templateId}
            onChange={(e) => {
              const next = e.target.value as TemplateId;
              setTemplateId(next);
              setFormat(TEMPLATES[next].defaultFormat);
            }}
            data-autofocus
          >
            {TEMPLATE_IDS.map((t) => (
              <option key={t} value={t}>
                {TEMPLATES[t].name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Send to" htmlFor={`${id}-destination`}>
          <select id={`${id}-destination`} className="input" value={destination} onChange={(e) => setDestination(e.target.value as IntegrationId)}>
            {SCHEDULABLE.map((d) => (
              <option key={d} value={d}>
                {INTEGRATIONS[d].name}
                {needsConnection(d) && !state.connections.some((c) => c.id === d) ? " (not connected)" : ""}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          <p className="label">Repeat</p>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label="Repeat"
              value={frequency}
              onChange={setFrequency}
              options={[
                { value: "daily", label: "Daily" },
                { value: "weekly", label: "Weekly" },
                { value: "monthly", label: "Monthly" },
              ]}
            />
            {frequency === "weekly" && (
              <select aria-label="Day of week" className="input w-auto py-1.5" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            )}
            {frequency === "monthly" && (
              <select aria-label="Day of month" className="input w-auto py-1.5" value={monthDay} onChange={(e) => setMonthDay(Number(e.target.value))}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Day {d}
                  </option>
                ))}
              </select>
            )}
            <input type="time" aria-label="Time" className="input w-auto py-1.5" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        {destination === "email" && (
          <div className="sm:col-span-2">
            <Field label="Recipients" htmlFor={`${id}-recipients`} hint="Separate addresses with commas.">
              <input id={`${id}-recipients`} className="input" placeholder="name@example.com" value={recipients} onChange={(e) => setRecipients(e.target.value)} />
            </Field>
          </div>
        )}
        {destination === "google-sheets" && (
          <Field label="Spreadsheet" htmlFor={`${id}-sheet`}>
            <input id={`${id}-sheet`} className="input" value={target.spreadsheet ?? ""} onChange={(e) => setTarget({ spreadsheet: e.target.value })} />
          </Field>
        )}
        {(destination === "google-drive" || destination === "dropbox" || destination === "onedrive") && (
          <Field label="Folder" htmlFor={`${id}-folder`}>
            <input id={`${id}-folder`} className="input font-mono text-[13px]" value={target.folder ?? ""} onChange={(e) => setTarget({ folder: e.target.value })} />
          </Field>
        )}
        {destination === "slack" && (
          <Field label="Channel" htmlFor={`${id}-channel`}>
            <input id={`${id}-channel`} className="input" value={target.channel ?? ""} onChange={(e) => setTarget({ channel: e.target.value })} />
          </Field>
        )}
        {destination !== "google-sheets" && TEMPLATES[templateId].formats.length > 1 && (
          <div>
            <p className="label">Format</p>
            <Segmented label="Format" value={format} onChange={setFormat} options={TEMPLATES[templateId].formats.map((f) => ({ value: f, label: f.toUpperCase() }))} />
          </div>
        )}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-lg border border-accent/20 bg-accent/[0.05] p-3">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <p className="text-sm text-ink-2">
          <span className="font-medium text-ink">{validTime ? describeSchedule(timing) : "Pick a time"}</span>
          {validTime && <> · next run {formatRunTime(nextRunAt(timing, new Date()).toISOString())}</>}
        </p>
      </div>
      {disconnected && (
        <p className="mt-3 flex items-start gap-2 text-sm text-ink-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
          {INTEGRATIONS[destination].name} isn&apos;t connected, so runs will fail until you connect it on the Integrations tab.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </Modal>
  );
}
