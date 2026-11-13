"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldAlert,
  Wrench,
  Moon,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import type { GateMode } from "@/lib/gate-operations";

/** Client-side mirror of the active-lockdown payload (do NOT import from
 *  server/policy — that file pulls in server-only code and would drag the
 *  server graph into the client bundle). */
export interface LockdownInfo {
  id: string;
  scopes: string[];
  message: string | null;
}

export interface GateModeBannerProps {
  mode: GateMode;
  /** Null when no lockdown is active. */
  lockdown: LockdownInfo | null;
  /** Whether the desk is currently allowed to scan. The override button is
   *  hidden when this is true (nothing to override) — the pill still shows
   *  so the operator can confirm the state. */
  scanningAllowed: boolean;
  /** Must post to /api/operator/mode with { mode: "OPEN", reason } and
   *  refetch. Throwing surfaces the error inline; do not swallow. */
  onOverrideMaintenance: (reason: string) => Promise<void>;
  /** Dismisses the lockdown banner for this session only. The scan remains
   *  disabled until an admin lifts the lockdown (DELETE /api/admin/lockdown). */
  onDismissLockdown: () => void;
}

function pillForMode(mode: GateMode, lockdown: LockdownInfo | null) {
  if (lockdown) {
    return {
      label: "LOCKDOWN",
      Icon: ShieldAlert,
      tone: "bg-action-danger text-white",
      pulse: true,
    };
  }
  switch (mode) {
    case "CURFEW":
      return {
        label: "CURFEW",
        Icon: Moon,
        tone: "bg-amber-500/20 text-action-warning border border-amber-500/40",
        pulse: false,
      };
    case "MAINTENANCE":
      return {
        label: "MAINTENANCE",
        Icon: Wrench,
        tone: "bg-amber-500/20 text-action-warning border border-amber-500/40",
        pulse: false,
      };
    case "OPEN":
    default:
      return {
        label: "OPEN",
        Icon: CheckCircle2,
        tone: "bg-emerald-500/20 text-action-success border border-emerald-500/40",
        pulse: false,
      };
  }
}

export function GateModeBanner({
  mode,
  lockdown,
  scanningAllowed,
  onOverrideMaintenance,
  onDismissLockdown,
}: GateModeBannerProps) {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { label, Icon, tone, pulse } = pillForMode(mode, lockdown);
  const isMaintenance = !lockdown && mode === "MAINTENANCE";
  const isCurfew = !lockdown && mode === "CURFEW";

  async function submitOverride(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError("Reason is required (min 3 chars) — it is written to the audit log.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onOverrideMaintenance(trimmed);
      setOverrideOpen(false);
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Override failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (isMaintenance) setOverrideOpen(true);
          }}
          className={[
            "flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide",
            tone,
            pulse ? "animate-pulse" : "",
            isMaintenance ? "cursor-pointer hover:opacity-90" : "cursor-default",
          ].join(" ")}
          aria-label={`Gate mode: ${label}${isMaintenance ? " — tap to override" : ""}`}
        >
          <Icon className="h-3 w-3" aria-hidden />
          {label}
        </button>

        {isMaintenance && (
          <button
            type="button"
            onClick={() => setOverrideOpen(true)}
            className="text-[11px] text-action-warning underline underline-offset-2"
          >
            Override
          </button>
        )}

        {isCurfew && (
          <span className="text-[11px] text-amber-400/80">
            Scans still allowed — curfew advisory
          </span>
        )}

        {lockdown && (
          <button
            type="button"
            onClick={onDismissLockdown}
            className="ml-1 inline-flex items-center gap-1 text-[11px] text-white/90 underline underline-offset-2"
            aria-label="Dismiss lockdown message (scan remains disabled)"
          >
            <X className="h-3 w-3" aria-hidden /> dismiss message
          </button>
        )}
      </div>

      {lockdown && (
        <div
          role="alert"
          className="mt-1 max-w-md rounded-md border border-action-danger bg-action-danger/10 px-2 py-1 text-[11px] text-action-danger"
        >
          <strong>Campus lockdown.</strong>{" "}
          {lockdown.message ?? "Scans are disabled until an administrator lifts the lockdown."}
          {lockdown.scopes.length > 0 && (
            <> Scopes: {lockdown.scopes.join(", ")}.</>
          )}
        </div>
      )}

      <Modal
        isOpen={overrideOpen}
        onClose={() => {
          if (submitting) return;
          setOverrideOpen(false);
          setError(null);
        }}
        title="Override maintenance mode"
        size="sm"
      >
        <form onSubmit={submitOverride} className="space-y-3">
          <p className="text-sm text-text-secondary">
            Gate mode is <strong>MAINTENANCE</strong> and scans are currently
            disabled. Overriding records the reason in the audit log and is
            visible to supervisors.
          </p>
          <Input
            autoFocus
            label="Reason"
            placeholder="e.g. verified gate sensor OK after field check"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            required
          />
          {error && (
            <p role="alert" className="text-sm text-action-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOverrideOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !scanningAllowed}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                "Override and re-enable scans"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
