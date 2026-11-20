/**
 * approver/ParentConsentStage — parent-consent node in the approval chain.
 *
 * When a pass requires parent consent, the approver sees this card in
 * StageQueuePanel to route it to the parent (or auto-approve if consent
 * was pre-granted in ParentConsentInbox).
 */

"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Clock, CheckCircle2, XCircle, Forward } from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { useUIStore } from "@/stores/uiStore";

export interface ParentConsentStageProps {
  request: PermissionItem;
  className?: string;
  /** Called when the parent-consent action completes. */
  onConsentResolved?: (consentId: string, action: "approved" | "declined" | "routed") => void;
}

export function ParentConsentStage({ request, className, onConsentResolved }: ParentConsentStageProps) {
  const { addToast } = useUIStore();
  const [consent, setConsent] = useState<{
    id: string;
    status: "pending" | "approved" | "declined";
    expiresAt: string;
  } | null>(null);

  // Fetch the consent record for this request.
  useEffect(() => {
    fetch(`/api/permissions/${request.id}/consent`, {
      headers: getAuthHeaders(),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (b?.data) setConsent(b.data);
      })
      .catch(() => {});
  }, [request.id]);

  const route = async () => {
    try {
      const res = await fetch(`/api/permissions/${request.id}/route-to-parent`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const b = await res.json().catch(() => null);
      if (res.ok) {
        addToast({ variant: "success", title: "Routed to parent", message: "Parent notified for consent." });
        onConsentResolved?.(request.id, "routed");
      } else {
        addToast({ variant: "error", title: "Routing failed", message: b?.error?.message ?? "Could not route." });
      }
    } catch {
      addToast({ variant: "error", title: "Routing failed", message: "Network error." });
    }
  };

  if (!consent) return null;

  const decided = consent.status === "approved" || consent.status === "declined";

  return (
    <div
      className={cn(
        "rounded-xl border p-3 space-y-2",
        consent.status === "approved" && "border-emerald-500/30 bg-emerald-500/5",
        consent.status === "declined" && "border-rose-500/30 bg-rose-500/5",
        consent.status === "pending" && "border-amber-500/30 bg-amber-500/5",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck
          className={cn(
            "h-4 w-4",
            consent.status === "approved" ? "text-emerald-500"
              : consent.status === "declined" ? "text-rose-500"
              : "text-amber-500"
          )}
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-primary">Parent consent</p>
          <p className="text-[10px] text-text-muted">
            {decided
              ? `Parent ${consent.status}`
              : "Awaiting parent approval"}
          </p>
        </div>
        <div className="ml-auto">
          {decided ? (
            <span
              className={cn(
                "text-[10px] font-semibold uppercase",
                consent.status === "approved" ? "text-emerald-500" : "text-rose-500"
              )}
            >
              {consent.status}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void route()}
              className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-1 text-[10px] font-semibold text-amber-600 hover:bg-amber-500/20"
            >
              <Forward className="h-3 w-3" /> Route to parent
            </button>
          )}
        </div>
      </div>

      {!decided && (
        <p className="text-[10px] text-text-muted flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Consent expires {new Date(consent.expiresAt).toLocaleString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}

export default ParentConsentStage;
