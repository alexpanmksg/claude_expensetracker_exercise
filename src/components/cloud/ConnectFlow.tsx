"use client";

import { Check, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useCloud } from "@/components/providers/CloudProvider";
import { Modal } from "@/components/ui/Modal";
import { INTEGRATIONS, isEmail } from "@/lib/cloud/integrations";
import type { IntegrationId } from "@/lib/cloud/types";
import { IntegrationTile, SimulatedBadge } from "./ui";

/**
 * A stand-in for an OAuth hand-off: a brief "opening sign-in" moment, then a consent screen.
 * Nothing contacts the real provider.
 */
export function ConnectFlow({ id, onConnected, onCancel }: { id: IntegrationId; onConnected: () => void; onCancel: () => void }) {
  const { connect } = useCloud();
  const spec = INTEGRATIONS[id];
  const [phase, setPhase] = useState<"redirect" | "consent" | "connecting">("redirect");
  const [account, setAccount] = useState("you@example.com");
  const accountId = useId();
  const valid = isEmail(account);
  // Parents re-render on every progress tick; refs keep those renders from restarting the timers.
  const finish = useRef(() => {});
  finish.current = () => {
    connect(id, account.trim());
    onConnected();
  };

  useEffect(() => {
    if (phase === "consent") return;
    const t = window.setTimeout(() => (phase === "redirect" ? setPhase("consent") : finish.current()), phase === "redirect" ? 1100 : 700);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "redirect") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center" role="status">
        <IntegrationTile id={id} size="lg" active />
        <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden />
        <p className="text-sm text-ink-2">Opening {spec.provider} sign-in…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IntegrationTile id={id} size="sm" active />
            <span className="text-sm font-medium text-ink">Sign in with {spec.provider}</span>
          </div>
          <SimulatedBadge />
        </div>
        <h3 className="mt-4 text-base font-semibold text-ink">Tally wants to access your {spec.provider} account</h3>

        <label htmlFor={accountId} className="mt-4 block text-xs font-medium text-muted">
          Account
        </label>
        <input
          id={accountId}
          type="email"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          disabled={phase === "connecting"}
          className={`input mt-1 ${valid ? "" : "input-error"}`}
          aria-invalid={!valid}
          data-autofocus
        />

        <p className="mt-4 text-xs font-medium text-muted">This will allow Tally to:</p>
        <ul className="mt-2 space-y-2">
          {spec.permissions.map((p) => (
            <li key={p} className="flex gap-2 text-sm text-ink-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-4 flex gap-2 rounded-lg bg-surface-2 p-2.5 text-xs text-ink-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          Demo connection: no sign-in happens and nothing is sent to {spec.provider}. Your data stays in this browser.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={phase === "connecting"}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={() => setPhase("connecting")} disabled={!valid || phase === "connecting"}>
            {phase === "connecting" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {phase === "connecting" ? "Connecting…" : "Allow"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConnectDialog({ id, onClose }: { id: IntegrationId | null; onClose: () => void }) {
  return (
    <Modal open={id !== null} onClose={onClose} title={id ? `Connect ${INTEGRATIONS[id].name}` : ""} size="md">
      {id && <ConnectFlow key={id} id={id} onConnected={onClose} onCancel={onClose} />}
    </Modal>
  );
}
