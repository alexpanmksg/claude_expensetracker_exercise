"use client";

import { Check, Copy, ExternalLink, EyeOff, Loader2, Lock, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useCloud } from "@/components/providers/CloudProvider";
import { Modal } from "@/components/ui/Modal";
import { EXPIRY_OPTIONS, QR_MAX_URL_LENGTH } from "@/lib/cloud/share";
import { TEMPLATES } from "@/lib/cloud/templates";
import { formatDateTime } from "@/lib/cloud/time";
import { TEMPLATE_IDS, type DateRange, type ShareLink, type TemplateId } from "@/lib/cloud/types";
import { Segmented, Switch } from "./ui";

export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(t);
  }, [copied]);
  return [
    copied,
    (text: string) => {
      navigator.clipboard?.writeText(text).then(
        () => setCopied(true),
        () => setCopied(false),
      );
    },
  ];
}

/** Renders a link as an SVG QR code, or explains why it's too long to scan. */
export function ShareQr({ url }: { url: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const tooLong = url.length > QR_MAX_URL_LENGTH;
  useEffect(() => {
    if (tooLong) return;
    let live = true;
    // Dark modules on white whatever the theme: phone cameras need the contrast.
    QRCode.toString(url, { type: "svg", errorCorrectionLevel: "L", margin: 2, color: { dark: "#111111", light: "#ffffff" } }).then(
      (s) => live && setSvg(s),
      () => live && setSvg(null),
    );
    return () => {
      live = false;
    };
  }, [url, tooLong]);

  if (tooLong) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-center">
        <QrCode className="h-6 w-6 text-muted" aria-hidden />
        <p className="text-xs text-ink-2">
          This report is too large for a scannable QR code ({url.length.toLocaleString("en-US")} characters). Share the link, or use Monthly Summary for a QR-sized report.
        </p>
      </div>
    );
  }
  return svg ? (
    <div className="mx-auto w-full max-w-[12rem] overflow-hidden rounded-lg border border-border" role="img" aria-label="QR code for the share link" dangerouslySetInnerHTML={{ __html: svg }} />
  ) : (
    <div className="mx-auto flex aspect-square w-full max-w-[12rem] items-center justify-center rounded-lg bg-surface-2">
      <Loader2 className="h-5 w-5 animate-spin text-muted" aria-hidden />
    </div>
  );
}

export function LinkResult({ link }: { link: ShareLink }) {
  const [copied, copy] = useCopy();
  return (
    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
      <div className="min-w-0 space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-ink">
          <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
          Link ready. Anyone with it can view this report.
        </div>
        <div className="flex gap-2">
          <input readOnly value={link.url} aria-label="Share link" className="input min-w-0 flex-1 font-mono text-xs" onFocus={(e) => e.target.select()} data-autofocus />
          <button type="button" className="btn-primary shrink-0 px-3" onClick={() => copy(link.url)}>
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <dl className="space-y-1 text-xs">
          <div className="flex gap-2">
            <dt className="w-16 text-muted">Report</dt>
            <dd className="text-ink-2">{link.title}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 text-muted">Expires</dt>
            <dd className="text-ink-2">{link.expiresAt ? formatDateTime(link.expiresAt) : "Never"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 text-muted">Privacy</dt>
            <dd className="text-ink-2">{link.redacted ? "Descriptions hidden" : "Includes descriptions"}</dd>
          </div>
        </dl>
        <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
          <ExternalLink className="h-4 w-4" aria-hidden />
          Open shared view
        </a>
        <p className="flex gap-2 text-xs text-muted">
          <Lock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          The report travels inside the link (after the #), which browsers never send to a server. Because of that, a sent link can&apos;t be revoked, only left to expire.
        </p>
      </div>
      <ShareQr url={link.url} />
    </div>
  );
}

export function ShareDialog({ preset, onClose }: { preset: { templateId?: TemplateId; range?: DateRange }; onClose: () => void }) {
  const { createShare } = useCloud();
  const [templateId, setTemplateId] = useState<TemplateId>(preset.templateId ?? "monthly-summary");
  const [expiry, setExpiry] = useState<(typeof EXPIRY_OPTIONS)[number]["id"]>("7d");
  const [redact, setRedact] = useState(false);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<ShareLink | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const ms = EXPIRY_OPTIONS.find((o) => o.id === expiry)!.ms;
      // A history entry's range only applies to the template it came from.
      const range = preset.templateId === templateId ? preset.range : undefined;
      setLink(await createShare({ templateId, range, expiresInMs: ms, redact }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!busy}
      title="Share a report"
      description="Create a read-only link and QR code. No account needed to open it."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          {link ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => setLink(null)}>
                Create another
              </button>
              <button type="button" className="btn-primary" onClick={onClose}>
                Done
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={generate} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {busy ? "Creating link…" : "Create link"}
              </button>
            </>
          )}
        </div>
      }
    >
      {link ? (
        <LinkResult link={link} />
      ) : (
        <div className="space-y-5">
          <fieldset>
            <legend className="label">Report</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {TEMPLATE_IDS.map((id) => {
                const t = TEMPLATES[id];
                return (
                  <label
                    key={id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40 ${
                      id === templateId ? "border-accent bg-accent/[0.05] font-medium text-ink" : "border-border text-ink-2 hover:bg-surface-2"
                    }`}
                  >
                    <input type="radio" name="share-template" className="sr-only" checked={id === templateId} onChange={() => setTemplateId(id)} data-autofocus={id === templateId || undefined} />
                    <t.icon className="h-4 w-4 shrink-0" aria-hidden />
                    {t.name}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div>
            <p className="label">Link expires after</p>
            <Segmented label="Link expires after" value={expiry} onChange={setExpiry} options={EXPIRY_OPTIONS.map((o) => ({ value: o.id, label: o.label }))} />
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border p-3">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">Hide descriptions</p>
              <p className="text-xs text-ink-2">Share amounts and categories only. Descriptions are removed before the link is made, so they never leave this device.</p>
            </div>
            <Switch checked={redact} onChange={setRedact} label="Hide descriptions" />
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
