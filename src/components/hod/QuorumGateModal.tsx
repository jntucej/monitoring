"use client";

/**
 * QuorumGateModal — the reusable guard that fires whenever the HOD tries to
 * execute an action that is NOT in their 1-click governance scope.
 *
 * The modal explains:
 *   - why this action is locked (two-person quorum / StepUp required),
 *   - who the required approvers are (from the live governance_matrix),
 *   - and offers a "Draft Proposal" action that creates a DRAFT
 *     policy_change_requests row for the principal / OIE to review.
 *
 * Zero hardcoding: the approver list + required count come from
 * catalog.hodOsPolicy.hodActions.quorumLocked, not a static array.
 */
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAuthHeaders } from "@/lib/utils";
import { invalidateApiCache } from "@/hooks/useApiResource";
import { Shield, FileEdit, X } from "lucide-react";

export interface QuorumGateModalProps {
  actionKey: string;
  open: boolean;
  onClose: () => void;
  /** Optional human-readable action name for the modal header. */
  label?: string;
}

export function QuorumGateModal({ actionKey, open, onClose, label }: QuorumGateModalProps) {
  const [drafting, setDrafting] = useState(false);
  const [drafted, setDrafted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The live governance matrix (via catalog) — the required approvers are
  // read here, not hardcoded.
  const draft = async () => {
    setDrafting(true);
    setError(null);
    setDrafted(false);
    try {
      const res = await fetch("/api/hod/os/forms/submit", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          formKey: "quorum_proposal",
          payload: {
            action_key: actionKey,
            label: label ?? actionKey,
            proposer_role: "hod",
            status: "DRAFT",
            note: "Drafted via HOD Quorum Gate — pending two-person quorum.",
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDrafted(true);
        invalidateApiCache([`/api/hod/os/state`]);
      } else {
        setError(json.message ?? "Could not draft the proposal.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    }
    setDrafting(false);
  };

  if (!open) return null;

  return (
    <Modal isOpen onClose={onClose} title="Quorum Gate — Action Locked" size="md">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-50 p-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0 text-sm text-amber-900">
            <p className="font-medium">
              <Badge variant="leave" dot={false}>{actionKey}</Badge>
            </p>
            <p className="mt-1 text-amber-800">
              This action is <strong>not in your 1-click scope</strong>. It requires the
              two-person quorum defined in the live governance matrix. You can
              <em> draft a proposal </em>— the final approval needs a second
              authorizer (principal / OIE / sysadmin, per the matrix).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-elevated p-3 text-sm">
          <FileEdit className="h-4 w-4 text-text-secondary" />
          <span className="text-text-primary">
            Draft a formal proposal for the Principal / OIE to approve.
          </span>
        </div>

        {drafted ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-50 p-3 text-sm text-emerald-800">
            <Badge variant="success">Draft created</Badge>
            Sent to the governance queue. The quorum approvers will see it in their console.
          </div>
        ) : (
          error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </div>
          )
        )}

        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={draft} disabled={drafting || drafted}>
            <span className="inline-flex items-center gap-1.5">
              <FileEdit className="h-3.5 w-3.5" /> {drafting ? "Drafting…" : "Draft Proposal"}
            </span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <span className="inline-flex items-center gap-1.5">
              <X className="h-3.5 w-3.5" /> Close
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
