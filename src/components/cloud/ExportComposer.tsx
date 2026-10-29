"use client";

import { ArrowLeft, ArrowRight, Check, Link2, Plug, X } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { useCloud } from "@/components/providers/CloudProvider";
import { useExpenses } from "@/components/providers/ExpensesProvider";
import { Modal } from "@/components/ui/Modal";
import { describeRange } from "@/lib/cloud/digest";
import { defaultTarget, describeTarget, INTEGRATION_GROUPS, INTEGRATIONS, isEmail, needsConnection, validateTarget } from "@/lib/cloud/integrations";
import { reportFile } from "@/lib/cloud/render";
import { buildReport, TEMPLATES } from "@/lib/cloud/templates";
import { TEMPLATE_IDS, type ExportFormat, type IntegrationId, type JobTarget, type TemplateId } from "@/lib/cloud/types";
import { ConnectFlow } from "./ConnectFlow";
import { EmailPreview, FilePreviewChip, SheetPreview, SlackPreview } from "./Previews";
import { ReportView } from "./ReportView";
import { Field, IntegrationTile, Segmented, SimulatedBadge, Switch } from "./ui";

export interface ComposerPreset {
  templateId?: TemplateId;
  destination?: IntegrationId;
}

const STEPS = ["Template", "Destination", "Details"];

const RUN_LABEL: Record<IntegrationId, string> = {
  download: "Download file",
  email: "Send email",
  "google-sheets": "Write to Sheets",
  "google-drive": "Upload to Drive",
  dropbox: "Upload to Dropbox",
  onedrive: "Upload to OneDrive",
  slack: "Post to Slack",
};

export function ExportComposer({ preset, onClose }: { preset: ComposerPreset; onClose: () => void }) {
  const { expenses } = useExpenses();
  const { state, startExport, setLiveSync } = useCloud();
  const now = useMemo(() => new Date(), []);
  const [step, setStep] = useState(preset.templateId ? (preset.destination ? 2 : 1) : 0);
  const [templateId, setTemplateId] = useState<TemplateId>(preset.templateId ?? "monthly-summary");
  const [destination, setDestination] = useState<IntegrationId>(preset.destination ?? "download");
  const [format, setFormat] = useState<ExportFormat>(TEMPLATES[templateId].defaultFormat);
  const [targets, setTargets] = useState<Partial<Record<IntegrationId, JobTarget>>>({});
  const [keepInSync, setKeepInSync] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [recipientDraft, setRecipientDraft] = useState("");
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const ids = { recipients: useId(), subject: useId(), message: useId(), sheet: useId(), folder: useId(), channel: useId() };

  const reports = useMemo(
    () => Object.fromEntries(TEMPLATE_IDS.map((id) => [id, buildReport(expenses, id, undefined, now)])) as Record<TemplateId, ReturnType<typeof buildReport>>,
    [expenses, now],
  );
  const report = reports[templateId];
  const file = useMemo(() => {
    const { blob, filename } = reportFile(report, format);
    return { filename, bytes: blob.size };
  }, [report, format]);

  const target: JobTarget = targets[destination] ?? defaultTarget(destination, report);
  const setTarget = (patch: Partial<JobTarget>) => setTargets((t) => ({ ...t, [destination]: { ...target, ...patch } }));
  const connected = (id: IntegrationId) => !needsConnection(id) || state.connections.some((c) => c.id === id);
  const targetError = validateTarget(destination, target);
  const spec = INTEGRATIONS[destination];

  const chooseTemplate = (id: TemplateId) => {
    setTemplateId(id);
    setFormat(TEMPLATES[id].defaultFormat);
    // Subjects default to the report title, so refresh them when the template changes.
    setTargets((t) => (t.email ? { ...t, email: { ...t.email, subject: reports[id].title } } : t));
  };

  const addRecipient = () => {
    const value = recipientDraft.trim().replace(/,$/, "");
    if (!value) return true;
    if (!isEmail(value)) {
      setRecipientError(`“${value}” isn't a valid email address.`);
      return false;
    }
    if (!target.recipients?.includes(value)) setTarget({ recipients: [...(target.recipients ?? []), value] });
    setRecipientDraft("");
    setRecipientError(null);
    return true;
  };
  const onRecipientKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addRecipient();
    } else if (e.key === "Backspace" && !recipientDraft && target.recipients?.length) {
      setTarget({ recipients: target.recipients.slice(0, -1) });
    }
  };

  const run = () => {
    // A recipient still being typed counts, so "Send" doesn't silently drop it.
    if (destination === "email" && recipientDraft.trim() && !addRecipient()) return;
    const finalTarget = destination === "email" && recipientDraft.trim() ? { ...target, recipients: [...(target.recipients ?? []), recipientDraft.trim()] } : target;
    if (validateTarget(destination, finalTarget)) return;
    startExport({ templateId, destination, format: destination === "google-sheets" ? "csv" : format, target: finalTarget });
    if (destination === "google-sheets" && keepInSync) setLiveSync(destination, finalTarget.spreadsheet!.trim());
    onClose();
  };

  const canNext = step === 0 || (step === 1 && connected(destination) && !connecting);
  const pendingRecipient = destination === "email" && recipientDraft.trim() !== "" && isEmail(recipientDraft.trim());
  const canRun = !targetError || (pendingRecipient && validateTarget(destination, { ...target, recipients: [...(target.recipients ?? []), recipientDraft.trim()] }) === null);

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <p className="hidden text-xs text-muted sm:block">
        Step {step + 1} of {STEPS.length}
      </p>
      <div className="flex flex-1 justify-end gap-2 sm:flex-none">
        {step > 0 && (
          <button type="button" className="btn-secondary" onClick={() => (connecting ? setConnecting(false) : setStep(step - 1))}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
        )}
        {step < 2 ? (
          <button type="button" className="btn-primary" onClick={() => setStep(step + 1)} disabled={!canNext}>
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={run} disabled={!canRun} title={targetError ?? undefined}>
            {RUN_LABEL[destination]}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Modal open onClose={onClose} title="New export" description={`${TEMPLATES[templateId].name} · ${describeRange(report.range)}`} size={step === 2 ? "xl" : "lg"} footer={footer}>
      <ol className="mb-5 flex items-center gap-2 text-xs font-medium" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span className="h-px w-5 bg-border sm:w-8" aria-hidden />}
            <button
              type="button"
              disabled={i > step}
              onClick={() => {
                setConnecting(false);
                setStep(i);
              }}
              aria-current={i === step ? "step" : undefined}
              className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 transition-colors disabled:cursor-default ${
                i === step ? "bg-accent/10 text-accent" : i < step ? "text-ink-2 hover:bg-surface-2" : "text-muted"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  i < step ? "bg-accent text-accent-fg" : i === step ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"
                }`}
              >
                {i < step ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <fieldset>
          <legend className="sr-only">Template</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {TEMPLATE_IDS.map((id) => {
              const t = TEMPLATES[id];
              const selected = id === templateId;
              return (
                <label
                  key={id}
                  className={`flex cursor-pointer flex-col rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40 ${
                    selected ? "border-accent bg-accent/[0.05]" : "border-border hover:bg-surface-2/60"
                  }`}
                >
                  <input type="radio" name="template" className="sr-only" checked={selected} onChange={() => chooseTemplate(id)} data-autofocus={selected || undefined} />
                  <div className="flex items-start gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-accent text-accent-fg" : "bg-surface-2 text-ink-2"}`}>
                      <t.icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{t.name}</p>
                      <p className="text-xs text-muted">{t.audience}</p>
                    </div>
                    {selected && <Check className="h-4 w-4 text-accent" aria-hidden />}
                  </div>
                  <p className="mt-2 text-sm text-ink-2">{t.description}</p>
                  <p className="mt-3 text-xs text-muted">
                    {describeRange(reports[id].range)} · {reports[id].records} {reports[id].records === 1 ? "expense" : "expenses"}
                  </p>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {step === 1 &&
        (connecting ? (
          <ConnectFlow id={destination} onConnected={() => setConnecting(false)} onCancel={() => setConnecting(false)} />
        ) : (
          <fieldset className="space-y-5">
            <legend className="sr-only">Destination</legend>
            {INTEGRATION_GROUPS.map((group) => (
              <div key={group}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{group}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.values(INTEGRATIONS)
                    .filter((i) => i.group === group)
                    .map((i) => {
                      const selected = i.id === destination;
                      const conn = state.connections.find((c) => c.id === i.id);
                      return (
                        <label
                          key={i.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40 ${
                            selected ? "border-accent bg-accent/[0.05]" : "border-border hover:bg-surface-2/60"
                          }`}
                        >
                          <input type="radio" name="destination" className="sr-only" checked={selected} onChange={() => setDestination(i.id)} data-autofocus={selected || undefined} />
                          <IntegrationTile id={i.id} active={selected} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                              {i.name}
                              {i.provider && <SimulatedBadge />}
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {!i.provider ? "Built in" : conn ? `Connected · ${conn.account}` : "Not connected"}
                            </span>
                          </span>
                          {selected && <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />}
                        </label>
                      );
                    })}
                </div>
              </div>
            ))}
            {!connected(destination) && (
              <div className="flex flex-col gap-3 rounded-lg border border-accent/30 bg-accent/[0.05] p-3 sm:flex-row sm:items-center">
                <p className="flex-1 text-sm text-ink-2">Connect {spec.name} to send exports there.</p>
                <button type="button" className="btn-primary px-3 py-1.5" onClick={() => setConnecting(true)}>
                  <Plug className="h-4 w-4" aria-hidden />
                  Connect {spec.name}
                </button>
              </div>
            )}
          </fieldset>
        ))}

      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <IntegrationTile id={destination} active />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{spec.name}</p>
                <p className="truncate text-xs text-muted">{state.connections.find((c) => c.id === destination)?.account ?? "Built in"}</p>
              </div>
            </div>

            {destination === "email" && (
              <>
                <Field label="To" htmlFor={ids.recipients} error={recipientError} hint="Press Enter or comma after each address.">
                  <div className={`input flex min-h-[2.5rem] flex-wrap items-center gap-1.5 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 ${recipientError ? "input-error" : ""}`}>
                    {target.recipients?.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 rounded-full bg-accent/10 py-0.5 pl-2 pr-1 text-xs font-medium text-ink">
                        {r}
                        <button type="button" aria-label={`Remove ${r}`} className="rounded-full p-0.5 hover:bg-accent/20" onClick={() => setTarget({ recipients: target.recipients!.filter((x) => x !== r) })}>
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      </span>
                    ))}
                    <input
                      id={ids.recipients}
                      type="email"
                      value={recipientDraft}
                      onChange={(e) => {
                        setRecipientDraft(e.target.value);
                        setRecipientError(null);
                      }}
                      onKeyDown={onRecipientKey}
                      onBlur={addRecipient}
                      placeholder={target.recipients?.length ? "" : "name@example.com"}
                      className="min-w-[8rem] flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
                      data-autofocus
                    />
                  </div>
                </Field>
                <Field label="Subject" htmlFor={ids.subject}>
                  <input id={ids.subject} className="input" value={target.subject ?? ""} onChange={(e) => setTarget({ subject: e.target.value })} />
                </Field>
                <Field label="Message" htmlFor={ids.message}>
                  <textarea id={ids.message} rows={3} className="input resize-none" value={target.message ?? ""} onChange={(e) => setTarget({ message: e.target.value })} />
                </Field>
              </>
            )}

            {destination === "google-sheets" && (
              <>
                <Field label="Spreadsheet" htmlFor={ids.sheet} hint="Each section becomes its own tab.">
                  <input id={ids.sheet} className="input" value={target.spreadsheet ?? ""} onChange={(e) => setTarget({ spreadsheet: e.target.value })} data-autofocus />
                </Field>
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">Keep in sync</p>
                    <p className="text-xs text-ink-2">Mirror every expense change into this spreadsheet automatically, a few seconds after you make it.</p>
                  </div>
                  <Switch checked={keepInSync} onChange={setKeepInSync} label="Keep in sync" />
                </div>
              </>
            )}

            {(destination === "google-drive" || destination === "dropbox" || destination === "onedrive") && (
              <Field label="Folder" htmlFor={ids.folder}>
                <input id={ids.folder} className="input font-mono text-[13px]" value={target.folder ?? ""} onChange={(e) => setTarget({ folder: e.target.value })} data-autofocus />
              </Field>
            )}

            {destination === "slack" && (
              <Field label="Channel" htmlFor={ids.channel}>
                <input id={ids.channel} className="input" value={target.channel ?? ""} onChange={(e) => setTarget({ channel: e.target.value })} data-autofocus />
              </Field>
            )}

            {destination !== "google-sheets" && TEMPLATES[templateId].formats.length > 1 && (
              <div>
                <p className="label">File format</p>
                <Segmented
                  label="File format"
                  value={format}
                  onChange={setFormat}
                  options={TEMPLATES[templateId].formats.map((f) => ({ value: f, label: f === "csv" ? "CSV (spreadsheets)" : "JSON (data)" }))}
                />
              </div>
            )}

            {destination !== "google-sheets" && <FilePreviewChip file={file} />}
            {targetError && !pendingRecipient && destination !== "email" && <p className="text-xs text-danger">{targetError}</p>}
            {destination !== "download" && (
              <p className="flex gap-1.5 text-xs text-muted">
                <Link2 className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                Runs in the background. Track it in the activity panel and History.
              </p>
            )}
          </div>

          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Preview {describeTarget(destination, target) && <span className="font-normal normal-case">· {describeTarget(destination, target)}</span>}
            </p>
            {destination === "email" ? (
              <EmailPreview report={report} target={target} file={file} />
            ) : destination === "google-sheets" ? (
              <SheetPreview report={report} spreadsheet={target.spreadsheet ?? ""} />
            ) : destination === "slack" ? (
              <SlackPreview report={report} channel={target.channel ?? ""} file={file} />
            ) : (
              <div className="rounded-xl border border-border p-4">
                <p className="mb-3 text-sm font-semibold text-ink">{report.title}</p>
                <ReportView report={report} rowLimit={5} />
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
