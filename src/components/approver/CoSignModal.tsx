/**
 * approver/CoSignModal — dual-approval co-sign dialog.
 *
 * Shown when a probation-flagged subject's ticket is approved: the
 * approving actor must select a second actor (tier+1) who co-signs.
 * Both signatures are recorded in the audit log.
 */

"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, Shield, User } from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { useUIStore } from "@/stores/uiStore";
import type { CoCPolicy } from "@/lib/conduct";
import type { PermissionItem } from "@/components/approver/PermissionRow";

export interface CoSignModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: PermissionItem;
  policy: CoCPolicy;
  /** List of roles that can co-sign (tier+1 or above). */
  coSigners: Array<{ userId: string; name: string; role: string }>;
  onCoSigned?: () => void;
}

export function CoSignModal({
  isOpen,
  onClose,
  request,
  policy,
  coSigners,
  onCoSigned,
}: CoSignModalProps) {
  const { addToast } = useUIStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/permissions/${request.id}/approve`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: "APPROVED",
          coSignRequired: true,
          coSignPolicy: policy.id,
          coSignerId: selectedId,
          comment: comment || undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        addToast({
          variant: "success",
          title: "Approved with co-sign",
          message: "Both signatures recorded in the audit log.",
        });
        onCoSigned?.();
        onClose();
      } else {
        addToast({
          variant: "error",
          title: "Co-sign failed",
          message: body?.error?.message ?? "Could not approve.",
        });
      }
    } catch {
      addToast({ variant: "error", title: "Co-sign failed", message: "Network error." });
    } finally {
      setSubmitting(false);
    }
  };

  const coSigner = coSigners.find((c) => c.userId === selectedId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dual Approval Required" size="sm">
      <div className="space-y-4">
        {/* Policy explanation */}
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs">
          <p className="font-semibold text-amber-600 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Co-sign required
          </p>
          <p className="text-text-muted mt-1">{policy.rule}</p>
        </div>

        {/* Co-signer picker */}
        <div>
          <label className="text-xs font-medium text-text-muted block mb-1.5">
            Select co-signer (tier+1 or above)
          </label>
          <div className="space-y-1.5">
            {coSigners.length === 0 ? (
              <p className="text-xs text-text-muted">No co-signers available. Escalate instead.</p>
            ) : (
              coSigners.map((c) => (
                <button
                  key={c.userId}
                  type="button"
                  onClick={() => setSelectedId(c.userId)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition",
                    selectedId === c.userId
                      ? "border-action-primary bg-action-primary/10"
                      : "border-border bg-bg-base hover:bg-bg-elevated"
                  )}
                >
                  <User className="h-4 w-4 text-text-muted shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-text-primary truncate">{c.name}</p>
                    <p className="text-[10px] text-text-muted">{c.role}</p>
                  </div>
                  {selectedId === c.userId && (
                    <CheckCircle2 className="h-4 w-4 text-action-primary shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Optional comment */}
        <div>
          <label className="text-xs font-medium text-text-muted block mb-1">
            Comment (optional)
          </label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="e.g. Verified with parent over phone"
            className="surface-card w-full bg-bg-base px-3 py-2 text-xs text-text-primary focus:outline-none"
          />
        </div>

        {coSigner && (
          <p className="text-[10px] text-text-muted">
            Co-signer: <span className="font-medium text-text-primary">{coSigner.name}</span> ({coSigner.role})
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-xs text-text-secondary hover:bg-bg-elevated"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!selectedId || submitting}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5",
              "bg-amber-500 text-white hover:opacity-90 disabled:opacity-40"
            )}
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
            Approve with co-sign
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default CoSignModal;
