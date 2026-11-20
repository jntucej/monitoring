/**
 * approver/QuotaOverrideModal — warden can override the quota limit for a
 * single pass (e.g. a student is at their outpass quota but has a valid
 * reason). Requires a documented reason that goes into the audit log.
 */

"use client";

import { useState } from "react";
import { Loader2, Gauge, X } from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { useUIStore } from "@/stores/uiStore";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import type { PassTypeConfig } from "@/lib/pass-types";

export interface QuotaOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PermissionItem;
  config: PassTypeConfig;
  onApproved?: () => void;
}

export function QuotaOverrideModal({ isOpen, onClose, request, config, onApproved }: QuotaOverrideModalProps) {
  const { addToast } = useUIStore();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/permissions/${request.id}/approve`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "APPROVED",
          reason: `Quota override: ${reason.trim()}`,
          overrideQuota: true,
          quotaKey: config.quotaKey,
        }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        addToast({ variant: "success", title: "Quota override approved", message: "Audit logged." });
        onApproved?.();
        onClose();
      } else {
        addToast({ variant: "error", title: "Override failed", message: body?.error?.message ?? "Could not approve." });
      }
    } catch {
      addToast({ variant: "error", title: "Override failed", message: "Network error." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quota Override" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Gauge className="h-4 w-4 text-amber-500" />
          <span>
            {config.quotaKey ?? config.label}: quota {config.quotaLimit}/
            {config.quotaWindow} — override requires a documented reason.
          </span>
        </div>

        <div>
          <label className="text-xs font-medium text-text-muted block mb-1">
            Reason for override (required — goes into the audit log)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Family emergency — one-time exception"
            className="surface-card w-full bg-bg-base px-3 py-2 text-xs text-text-primary focus:outline-none resize-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-xs text-text-secondary hover:bg-bg-elevated flex items-center justify-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!reason.trim() || submitting}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1",
              "bg-amber-500 text-white hover:opacity-90 disabled:opacity-40"
            )}
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gauge className="h-3.5 w-3.5" />}
            Approve with override
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default QuotaOverrideModal;
