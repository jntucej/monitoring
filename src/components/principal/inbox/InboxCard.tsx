"use client";



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
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${
        stage === "warden_or_principal" || stage === "principal"
          ? "bg-indigo-500/10 text-action-primary border-indigo-500/20"
          : "bg-sky-500/10 text-action-info border-sky-500/20"
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
 * Tapping opens InboxDetailSheet (or navigates to /principal/approvals/pending).
 */
export function InboxCard({ ticket, onOpenDetail, selected, onToggleSelect }: InboxCardProps) {
  const student = ticket.student;
  const details = student?.student_details;


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
          ? "bg-action-primary/5 border-action-primary shadow-sm"
          : "bg-bg-surface border-border hover:bordertext-muted hover:shadow-sm"
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
                ? "bg-action-primary border-action-primary text-white"
                : "border-border bg-bg-elevated"
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
            <span className="surface-card font-mono text-xs font-bold px-1.5 py-0.5 bg-bg-elevated text-action-primary shrink-0">
              {ticket.ticket_number}
            </span>
            <SlaBadge slaDeadline={ticket.sla_deadline} status={ticket.status} />
            <PrincipalStageTag stage={ticket.current_stage} />
          </div>

          {/* Row 2: student name + roll */}
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-semibold text-sm text-text-primary truncate">
              {student?.name || "Unknown Student"}
            </span>
            {details?.roll && (
              <span className="text-xs text-text-muted font-mono shrink-0">
                ({details.roll})
              </span>
            )}
          </div>

          {/* Row 3: workflow / reason */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary min-w-0">
            <span className="capitalize">{ticket.workflow_type?.replace(/_/g, " ")}</span>
            {ticket.reason && (
              <span className="text-text-muted">· {ticket.reason.replace(/_/g, " ")}</span>
            )}
            {ticket.forwarded_from_role && (
              <span className="flex items-center gap-0.5 text-amber-500/80">
                <Forward className="size-3.5" />
                from {ticket.forwarded_from_role.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight className="w-4 h-4 text-text-muted shrink-0 mt-1 group-hover:text-text-primary transition-colors" />
      </div>
    </div>
  );
}
