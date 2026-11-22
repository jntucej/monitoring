/**
 * shared/pass/ParentConsentCard — pending parent-consent state for a pass.
 *
 * Reused by:
 *   - shared/pass/PassHub (student side: "waiting on parent")
 *   - parent/ParentConsentInbox (parent side: "act on this")
 *
 * Shows consent expiry countdown + approve/decline for parent mode.
 */

"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import type { PassTypeConfig } from "@/lib/pass-types";
import { useUIStore } from "@/stores/uiStore";

export interface ParentConsentCardProps {
  /** The pass type config (must have requiresParentConsent). */
  config: PassTypeConfig;
  /** The pending consent record. */
  consent: {
    id: string;
    expiresAt: string;
    status: "pending" | "approved" | "declined";
  };
  /** "student" = read-only status; "parent" = actionable. */
  mode: "student" | "parent";
  onAction?: (consentId: string, action: "approved" | "declined") => void;
  className?: string;
}

export function ParentConsentCard({
  config,
  consent,
  mode,
  onAction,
  className,
}: ParentConsentCardProps) {
  const { addToast } = useUIStore();
  const [, setTick] = useState(0);

  // Live expiry countdown
  useEffect(() => {
    if (consent.status !== "pending") return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [consent.status]);

  const expired = new Date(consent.expiresAt).getTime() < Date.now();
  const decided = consent.status === "approved" || consent.status === "declined";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-2.5",
        consent.status === "approved" && "border-action-success/30 bg-action-success/5",
        consent.status === "declined" && "border-action-danger/30 bg-action-danger/5",
        consent.status === "pending" && "border-action-warning/30 bg-action-warning/5",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck
          className={cn(
            "h-5 w-5",
            consent.status === "approved" ? "text-action-success"
              : consent.status === "declined" ? "text-action-danger"
              : "text-action-warning"
          )}
        />
        <div>
          <p className="text-sm font-semibold text-text-primary">Parent consent</p>
          <p className="text-xs text-text-muted">{config.label}</p>
        </div>
        <div className="ml-auto text-right">
          {decided ? (
            <p
              className={cn(
                "text-xs font-semibold uppercase",
                consent.status === "approved" ? "text-action-success" : "text-action-danger"
              )}
            >
              {consent.status}
            </p>
          ) : expired ? (
            <p className="text-xs font-semibold text-action-danger flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Expired
            </p>
          ) : (
            <p className="text-xs text-action-warning flex items-center gap-1">
              <Clock className="h-3 w-3" />
              expires {new Date(consent.expiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      </div>

      {/* Parent actionable buttons */}
      {mode === "parent" && !decided && !expired && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              onAction?.(consent.id, "approved");
              addToast({ variant: "success", title: "Approved", message: "Parent consent granted." });
            }}
            className="inline-flex items-center gap-1.5 flex-1 rounded-lg bg-action-success px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
          </button>
          <button
            type="button"
            onClick={() => {
              onAction?.(consent.id, "declined");
              addToast({ variant: "warning", title: "Declined", message: "Parent consent declined." });
            }}
            className="inline-flex items-center gap-1.5 flex-1 rounded-lg bg-action-danger/10 border border-action-danger/30 px-3 py-2 text-xs font-semibold text-action-danger hover:bg-action-danger/20"
          >
            <XCircle className="h-3.5 w-3.5" /> Decline
          </button>
        </div>
      )}

      {/* Student read-only note */}
      {mode === "student" && !decided && (
        <p className="text-xs text-text-muted">
          {expired
            ? "Consent window has expired. The request needs to be resubmitted."
            : "Waiting for your parent to approve this request."}
        </p>
      )}
    </div>
  );
}

export default ParentConsentCard;
