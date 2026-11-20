/**
 * shared/pass/ExtendPassModal — extension request for an existing pass.
 *
 * Re-enters the approval chain (the pass is not just extended; it goes
 * back to the next approver). Driven by PassTypeConfig.
 */

"use client";

import { useEffect, useState } from "react";
import { Loader2, Clock, X } from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { useUIStore } from "@/stores/uiStore";
import type { PassTypeConfig } from "@/lib/pass-types";
import { ApprovalChainPreview } from "@/components/shared/pass/ApprovalChainPreview";

export interface ExtendPassModalProps {
  open: boolean;
  onClose: () => void;
  /** The pass being extended. */
  pass: { id: string; to: string; code: string };
  config: PassTypeConfig;
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ExtendPassModal({ open, onClose, pass, config }: ExtendPassModalProps) {
  const { addToast } = useUIStore();
  const [newTo, setNewTo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Prefill with the current pass end time.
  useEffect(() => {
    if (open && pass.to) {
      const d = new Date(pass.to);
      // Default extension: +2 hours
      d.setHours(d.getHours() + 2);
      setNewTo(toLocalInput(d));
    }
  }, [open, pass.to]);

  const submit = async () => {
    if (!newTo) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/permissions/${pass.id}/extend`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ newTo: new Date(newTo).toISOString() }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        addToast({ variant: "success", title: "Extension requested", message: "Re-submitted for approval." });
        onClose();
      } else {
        addToast({ variant: "error", title: "Extension failed", message: body?.error?.message ?? "Could not extend." });
      }
    } catch {
      addToast({ variant: "error", title: "Extension failed", message: "Network error." });
    } finally {
      setSubmitting(false);
    }
  };

  const valid = newTo && new Date(newTo).getTime() > new Date(pass.to).getTime();

  return (
    <Modal isOpen={open} onClose={onClose} title="Extend pass" size="sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Current end</span>
          <span className="tabular-nums text-text-primary">
            {new Date(pass.to).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div>
          <label className="text-xs font-medium text-text-muted flex items-center gap-1 mb-1">
            <Clock className="h-3 w-3" /> New return time
          </label>
          <input
            type="datetime-local"
            value={newTo}
            onChange={(e) => setNewTo(e.target.value)}
            className="surface-card w-full bg-bg-base px-3 py-2 text-xs text-text-primary focus:outline-none"
          />
        </div>

        {/* Approval chain (re-enters) */}
        <ApprovalChainPreview config={config} />

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
            disabled={!valid || submitting}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1",
              "bg-action-primary text-white hover:opacity-90 disabled:opacity-40"
            )}
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Request extension
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ExtendPassModal;
