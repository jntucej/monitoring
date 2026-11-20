/**
 * parent/ParentConsentInbox — guardian's actionable pass-consent queue.
 *
 * Shows every ward's pending passes that require parent consent, with
 * approve/decline buttons. Uses ParentConsentCard in "parent" mode.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, Inbox, Loader2 } from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { ParentConsentCard } from "@/components/shared/pass/ParentConsentCard";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PASS_TYPE_SEED } from "@/lib/pass-types";
import type { PassTypeConfig } from "@/lib/pass-types";

interface ConsentItem {
  id: string;
  wardName: string;
  code: string;
  status: "pending" | "approved" | "declined";
  expiresAt: string;
  from: string;
  to: string;
}

export function ParentConsentInbox({ className }: { className?: string }) {
  const { addToast } = useUIStore();
  const [items, setItems] = useState<ConsentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/parent/consent", { headers: getAuthHeaders(), cache: "no-store" });
      const body = await res.json().catch(() => null);
      setItems((body?.data ?? []) as ConsentItem[]);
    } catch {}
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleAction = (consentId: string, action: "approved" | "declined") => {
    setItems((prev) => prev.map((i) => (i.id === consentId ? { ...i, status: action } : i)));
    addToast({
      variant: action === "approved" ? "success" : "warning",
      title: action === "approved" ? "Consent granted" : "Consent declined",
      message: "The student has been notified.",
    });
  };

  const pending = items.filter((i) => i.status === "pending");
  const decided = items.filter((i) => i.status !== "pending");

  // Look up the full config for a code from the seed (or active config).
  const toConfig = (code: string): PassTypeConfig => {
    const found = PASS_TYPE_SEED.find((c) => c.code === code);
    if (found) return found;
    // Fallback: minimal config for unknown codes
    return {
      code,
      label: code.replace(/_/g, " "),
      description: "",
      persona: "both",
      category: "leave",
      durationUnit: "hours",
      minDuration: 0,
      maxDuration: 48,
      requiresApproval: true,
      approvalChain: [],
      requiresParentConsent: true,
      parentConsentExpiryHours: 24,
      requiresGateScan: false,
      curfewApplies: false,
      expectedReturnRequired: false,
      destinationRequired: false,
      guardianAddressRequired: false,
      attachmentRequired: false,
      attachmentKinds: [],
      quotaKey: null,
      quotaLimit: null,
      quotaWindow: null,
      quotaOverrideTier: 3,
      messOffCoupling: false,
      messOffStandalone: false,
      isActive: true,
    };
  };

  return (
    <WidgetBoundary name="parent-consent-inbox">
      <div className={cn("space-y-4 rounded-xl border border-border bg-bg-elevated p-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-action-primary" />
            <h2 className="text-sm font-bold text-text-primary">Pass Consent</h2>
          </div>
          <span className="text-xs text-text-muted">
            {pending.length} pending · {decided.length} decided
          </span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading consent queue…
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-4">
            <Inbox className="h-8 w-8 text-text-muted/40 mx-auto mb-2" />
            <p className="text-xs text-text-muted">No consent requests yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-bg-base p-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-primary">{item.wardName}</span>
                  <span className="text-text-muted capitalize">{item.code.replace(/_/g, " ")}</span>
                </div>
                <ParentConsentCard
                  config={toConfig(item.code)}
                  consent={{
                    id: item.id,
                    expiresAt: item.expiresAt,
                    status: item.status,
                  }}
                  mode="parent"
                  onAction={handleAction}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetBoundary>
  );
}

export default ParentConsentInbox;
