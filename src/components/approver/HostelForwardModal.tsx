"use client";

import React, { useMemo, useState } from "react";
import { Forward, Lock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import { useUIStore } from "@/stores/uiStore";
import { levelsAbove, requiresStepup } from "@/lib/permission-workflow-pure";

const ROLE_LABELS: Record<string, string> = {
  caretaker: "Caretaker",
  deputy_warden: "Deputy Warden",
  hostel_manager: "Hostel Manager",
  principal: "Principal",
};

export interface HostelForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Ticket number the forward applies to. */
  ticket: string;
  /** The actor's current role (from the auth store). */
  actorRole: string;
  /** Fired after the forward succeeds so the caller can refresh. */
  onForwarded?: () => void;
}

/**
 * Modal that forwards a hostel ticket to a strictly-higher level in the
 * caretaker -> deputy_warden -> hostel_manager -> principal chain. The target
 * role list is derived from the pure `levelsAbove` helper (no local
 * re-derivation of the hierarchy). A step-up password is revealed only when
 * `requiresStepup` says the forward needs one (forward to L4, or flagged
 * reasons).
 */
export function HostelForwardModal({
  isOpen,
  onClose,
  ticket,
  actorRole,
  onForwarded,
}: HostelForwardModalProps) {
  const api = useApi();
  const addToast = useUIStore((s) => s.addToast);

  const targetRoles = useMemo(() => levelsAbove(actorRole), [actorRole]);

  const [targetRole, setTargetRole] = useState("");
  const [comment, setComment] = useState("");
  const [stepupPassword, setStepupPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stepupRequired = targetRole
    ? requiresStepup({ actorRole, action: "forward", targetRole })
    : false;

  const targetOptions: SelectOption[] = targetRoles.map((role) => ({
    value: role,
    label: ROLE_LABELS[role] || role,
  }));

  const submit = async () => {
    if (!targetRole) {
      setError("Select the level to forward to");
      return;
    }
    if (!comment.trim()) {
      setError("A forward comment is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/permissions/${encodeURIComponent(ticket)}/forward`, {
        method: "POST",
        headers: api.getHeaders(),
        body: JSON.stringify({
          targetRole,
          comment: comment.trim(),
          ...(stepupRequired ? { stepupPassword } : {}),
        }),
      });
      const json = await res.json();
      if (res.status === 403) {
        // Lockout or step-up failure — surface the server's message.
        addToast({
          message: json.error?.message || "Step-up verification failed or you are locked out. Try again later.",
          variant: "error",
        });
        setSubmitting(false);
        return;
      }
      if (json.success) {
        addToast({
          message: `Ticket ${ticket} forwarded to ${ROLE_LABELS[targetRole] || targetRole}`,
          variant: "success",
        });
        onClose();
        if (onForwarded) onForwarded();
      } else {
        setError(json.error?.message || "Forward was not accepted");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Forward ${ticket}`}
      size="md"
    >
      <div className="space-y-4">
        <p className="text-xs text-[var(--text-secondary)]">
          Forward this request to a higher hostel approval level.
        </p>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase">
            Forward to level
          </label>
          {targetRoles.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic">
              No higher level available (you are already at the top).
            </p>
          ) : (
            <Select
              options={targetOptions}
              value={targetRole}
              onChange={setTargetRole}
              placeholder="Select a higher level"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase">
            Comment (required)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Explain why this request needs a higher level"
            className="w-full text-sm p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--action-primary)]"
          />
        </div>

        {stepupRequired && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-500 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              Step-up password required
            </div>
            <Input
              type="password"
              value={stepupPassword}
              onChange={(e) => setStepupPassword(e.target.value)}
              placeholder="Enter your approval password"
            />
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button size="sm" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={submit}
            loading={submitting}
            disabled={submitting || targetRoles.length === 0}
          >
            <Forward className="w-3.5 h-3.5 mr-1" />
            Forward
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default HostelForwardModal;
