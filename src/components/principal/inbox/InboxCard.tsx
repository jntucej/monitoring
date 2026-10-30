"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronRight, Forward } from "lucide-react";
import { SlaBadge } from "@/components/approver/SlaBadge";
import type { PermissionItem } from "@/components/approver/PermissionRow";

/**
 * PrincipalStageTag — shows [WARDEN] or [PRINCIPAL] stage tag on the card.
 */
export function PrincipalStageTag({ stage }: { stage: string | null | undefined }) {
  if (!stage) return null;
  const label =
    stage === "warden_or_principal"
      ? "WARDEN / PRINCIPAL"
      : stage.toUpperCase();
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
        stage === "warden_or_principal" || stage === "principal"
          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
          : "bg-sky-500/10 text-sky-400 border-sky-500/20"
      }`}
    >
      {label}
    </span>
  );
}

export interface InboxCardProps {
  ticket: PermissionItem;
  onOpenDetail: (ticket: string) => void;
  selected?: boolean;
  onToggleSelect?: (ticket: string) => void;
}

/**
 * InboxCard — mobile-first card showing SLA badge, stage tag,
 * student name/roll, workflow/reason, and forwarded-by.
 * Tapping opens InboxDetailSheet (or navigates to /principal/inbox/[ticket]).
 */
export function InboxCard({ ticket, onOpenDetail, selected, onToggleSelect }: InboxCardProps) {
  const student = ticket.student;
  const details = student?.student_details;
  const isPending = ticket.status === "PENDING";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(ticket.ticket_number)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpenDetail(ticket.ticket_number);
      }}
      className={`group relative p-3.5 rounded-xl border transition-all duration-150 cursor-pointer min-w-0 ${
        selected
          ? "bg-[var(--action-primary)]/5 border-[var(--action-primary)] shadow-sm"
          : "bg-[var(--bg-surface)] border-[var(--border)] hover:border-[var(--text-muted)] hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {/* Checkbox */}
        {onToggleSelect && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(ticket.ticket_number);
            }}
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
              selected
                ? "bg-[var(--action-primary)] border-[var(--action-primary)] text-white"
                : "border-[var(--border)] bg-[var(--bg-elevated)]"
            }`}
            aria-label={`Select ${ticket.ticket_number}`}
          >
            {selected && (
              <svg className="w-3.5 h-3.5 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Row 1: ticket + SLA + stage */}
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--action-primary)] shrink-0">
              {ticket.ticket_number}
            </span>
            <SlaBadge slaDeadline={ticket.sla_deadline} status={ticket.status} />
            <PrincipalStageTag stage={ticket.current_stage} />
          </div>

          {/* Row 2: student name + roll */}
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
              {student?.name || "Unknown Student"}
            </span>
            {details?.roll && (
              <span className="text-xs text-[var(--text-muted)] font-mono shrink-0">
                ({details.roll})
              </span>
            )}
          </div>

          {/* Row 3: workflow / reason */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--text-secondary)] min-w-0">
            <span className="capitalize">{ticket.workflow_type?.replace(/_/g, " ")}</span>
            {ticket.reason && (
              <span className="text-[var(--text-muted)]">· {ticket.reason.replace(/_/g, " ")}</span>
            )}
            {ticket.forwarded_from_role && (
              <span className="flex items-center gap-0.5 text-amber-500/80">
                <Forward className="w-3 h-3" />
                from {ticket.forwarded_from_role.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-1 group-hover:text-[var(--text-primary)] transition-colors" />
      </div>
    </div>
  );
}
