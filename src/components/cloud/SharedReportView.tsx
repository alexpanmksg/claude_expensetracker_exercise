"use client";

import { Clock, Download, Eye, Lock, Unlink } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { downloadBlob, reportFile } from "@/lib/cloud/render";
import { decodeShare, type DecodeResult } from "@/lib/cloud/share";
import { formatDateTime, formatRelative } from "@/lib/cloud/time";
import { ReportView } from "./ReportView";

/** The recipient's view of a share link. Everything it shows comes from the URL fragment. */
export function SharedReportView() {
  const [result, setResult] = useState<DecodeResult | null>(null);

  useEffect(() => {
    // The fragment only exists in the browser, so this runs after the prerendered shell loads.
    const read = () => {
      const fragment = window.location.hash.slice(1);
      if (!fragment) setResult({ ok: false, reason: "invalid" });
      else decodeShare(fragment).then(setResult);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  if (!result) {
    return (
      <div aria-busy="true" aria-label="Opening shared report" className="space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!result.ok) {
    const expired = result.reason === "expired";
    return (
      <div className="card mx-auto max-w-lg">
        <EmptyState
          icon={expired ? Clock : Unlink}
          title={expired ? "This link has expired" : "This link doesn't work"}
          description={
            expired
              ? `It stopped working on ${formatDateTime(result.expiresAt)}. Ask the sender to share a fresh link.`
              : "It may have been cut off when it was copied, or edited. Ask the sender to share it again."
          }
        >
          <Link href="/" className="btn-secondary">
            Go to Tally
          </Link>
        </EmptyState>
      </div>
    );
  }

  const { report, createdAt, expiresAt } = result.payload;
  const download = (format: "csv" | "json") => {
    const { blob, filename } = reportFile(report, format);
    downloadBlob(blob, filename);
  };

  return (
    <article className="mx-auto max-w-4xl">
      <header className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.1] via-transparent to-transparent" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium text-ink-2">
              <Eye className="h-3 w-3" aria-hidden />
              Shared report · read-only
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{report.title}</h1>
            <p className="mt-1 text-sm text-ink-2">
              Shared {formatDateTime(createdAt)} · {expiresAt ? `Link expires ${formatRelative(expiresAt, new Date())}` : "Link doesn't expire"}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => download("csv")}>
              <Download className="h-4 w-4" aria-hidden />
              CSV
            </button>
            <button type="button" className="btn-secondary" onClick={() => download("json")}>
              <Download className="h-4 w-4" aria-hidden />
              JSON
            </button>
          </div>
        </div>
      </header>

      <div className="card p-5 sm:p-6">
        <ReportView report={report} />
      </div>

      <p className="mt-6 flex items-start justify-center gap-2 text-center text-xs text-muted">
        <Lock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
        This report travelled inside the link itself. It wasn&apos;t uploaded anywhere, and opening it didn&apos;t send it to a server.
      </p>
    </article>
  );
}
