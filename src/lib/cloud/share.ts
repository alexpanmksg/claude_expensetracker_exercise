import type { Report, ReportSection } from "./types";

/**
 * Share links carry the whole report, compressed, in the URL fragment (after #). Browsers never send
 * the fragment to a server, so the data goes only to whoever has the link. It also means a link
 * can't be revoked once sent; expiry is the control.
 */
export interface SharePayload {
  v: 1;
  report: Report;
  createdAt: string;
  expiresAt: string | null;
}

export type DecodeResult =
  | { ok: true; payload: SharePayload }
  | { ok: false; reason: "expired"; expiresAt: string }
  | { ok: false; reason: "invalid" };

/** QR codes past this length get too dense for phone cameras to read reliably. */
export const QR_MAX_URL_LENGTH = 1800;

export const EXPIRY_OPTIONS = [
  { id: "1d", label: "24 hours", ms: 24 * 3600 * 1000 },
  { id: "7d", label: "7 days", ms: 7 * 24 * 3600 * 1000 },
  { id: "30d", label: "30 days", ms: 30 * 24 * 3600 * 1000 },
  { id: "never", label: "Never", ms: null },
] as const;

/** Drops description columns entirely, so they never leave this device. */
export function redactReport(report: Report): Report {
  const strip = (s: ReportSection): ReportSection => {
    const keep = s.columns.map((c, i) => (c.label === "Description" ? -1 : i)).filter((i) => i >= 0);
    return { ...s, columns: keep.map((i) => s.columns[i]), rows: s.rows.map((r) => keep.map((i) => r[i])) };
  };
  // Highlights quote descriptions ("The largest single expense was Winter jacket…").
  return { ...report, sections: report.sections.map(strip), highlights: report.highlights.filter((h) => !h.startsWith("The largest single expense")), redacted: true };
}

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function encodeShare(payload: SharePayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(payload));
  return toBase64Url(await pipe(json, new CompressionStream("deflate-raw")));
}

function isPayload(value: unknown): value is SharePayload {
  const p = value as SharePayload;
  return (
    typeof p === "object" &&
    p !== null &&
    p.v === 1 &&
    typeof p.report?.title === "string" &&
    Array.isArray(p.report.sections) &&
    Array.isArray(p.report.stats) &&
    p.report.sections.every((s) => Array.isArray(s.columns) && Array.isArray(s.rows))
  );
}

export async function decodeShare(fragment: string, now = new Date()): Promise<DecodeResult> {
  try {
    const bytes = await pipe(fromBase64Url(fragment.replace(/^#/, "")), new DecompressionStream("deflate-raw"));
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!isPayload(payload)) return { ok: false, reason: "invalid" };
    if (payload.expiresAt && new Date(payload.expiresAt) <= now) return { ok: false, reason: "expired", expiresAt: payload.expiresAt };
    return { ok: true, payload };
  } catch {
    // Truncated or edited links fail to decompress or parse.
    return { ok: false, reason: "invalid" };
  }
}

export const shareUrl = (origin: string, token: string) => `${origin}/shared#${token}`;
