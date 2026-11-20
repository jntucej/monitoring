/**
 * shared/documents/DocumentStatusCard.tsx — the document's lifecycle:
 * pending → verified / rejected (with reason) + the track timeline +
 * re-upload-with-reason. Steps 2 (STATUS) + 4 (TRACK) + 6 (ESCALATE)
 * of the document loop.
 */

"use client";

import { useState } from "react";
import { FileCheck, FileQuestion, Clock, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDisputes } from "@/hooks/useDisputes";

export interface DocumentStatusCardProps {
  /** The permission/pass id the document belongs to. */
  ticketId: string;
  /** The ticket number (human-readable, shown in the header). */
  ticketNumber?: string;
  /** The document's current status. */
  status: "pending" | "verified" | "rejected";
  /** Rejection reason (when rejected). */
  reason?: string;
  /** The document URL (for the download / receipt link). */
  documentUrl?: string;
  /** When submitted. */
  submittedAt?: string;
  /** When verified. */
  verifiedAt?: string;
  className?: string;
}

export function DocumentStatusCard({
  ticketId,
  ticketNumber,
  status,
  reason,
  documentUrl,
  submittedAt,
  verifiedAt,
  className,
}: DocumentStatusCardProps) {
  const { create } = useDisputes();
  const [showReupload, setShowReupload] = useState(false);
  const [disputed, setDisputed] = useState(false);

  const meta = {
    pending: { Icon: Clock, label: "Pending review", accent: "text-amber-400", bg: "bg-amber-500/10" },
    verified: { Icon: FileCheck, label: "Verified", accent: "text-green-400", bg: "bg-green-500/10" },
    rejected: { Icon: FileQuestion, label: "Rejected", accent: "text-red-400", bg: "bg-red-500/10" },
  }[status];

  const Icon = meta.Icon;

  const reupload = async () => {
    setShowReupload(false);
    // Trigger the re-upload via the existing document endpoint.
    window.location.href = `/student/passes?ticket=${ticketId}&reupload=1`;
  };

  const dispute = async () => {
    const d = await create({
      entity_type: "document",
      entity_id: ticketId,
      reason: "document_rejection_disputed",
      evidence: { rejection_reason: reason },
    });
    if (d) setDisputed(true);
  };

  return (
    <div className={cn("surface-card p-4 space-y-3", className)}>
      {/* Status banner */}
      <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2", meta.bg)}>
        <Icon className={cn("h-4 w-4", meta.accent)} />
        <div>
          <p className={cn("text-xs font-medium", meta.accent)}>
            {ticketNumber ? `${ticketNumber} · ` : ""}
            {meta.label}
          </p>
          {submittedAt && (
            <p className="text-[10px] text-text-muted">
              Submitted {new Date(submittedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            </p>
          )}
        </div>
      </div>

      {/* Rejection reason + actions */}
      {status === "rejected" && reason && (
        <div className="rounded-lg bg-bg-elevated px-3 py-2 text-xs text-text-muted">
          <p className="font-medium text-text">Why: {reason}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={reupload}
              className={cn(
                "flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:bg-bg",
                showReupload && "border-action-primary text-action-primary",
              )}
            >
              <RotateCw className="h-3 w-3" />
              Re-upload
            </button>
            <button
              type="button"
              onClick={dispute}
              disabled={disputed}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] text-text-secondary hover:bg-bg disabled:opacity-50"
            >
              {disputed ? "Disputed ✓" : "I disagree"}
            </button>
          </div>
        </div>
      )}

      {/* Verified: receipt */}
      {status === "verified" && verifiedAt && (
        <p className="text-[11px] text-text-muted">
          Verified {new Date(verifiedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
        </p>
      )}

      {/* Document link */}
      {documentUrl && (
        <a
          href={documentUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-action-primary/80 underline hover:text-action-primary"
        >
          View document
        </a>
      )}
    </div>
  );
}

export default DocumentStatusCard;
