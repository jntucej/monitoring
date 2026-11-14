"use client";

import React from "react";
import { Clock, Shield, FileText, ArrowRight, MessageSquare } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { PermissionItem } from "@/components/approver/PermissionRow";

export interface PermissionTicketCardProps {
  /** A permission request as returned by GET /api/permissions (snake_case). */
  ticket: PermissionItem;
  /** Called with the ticket number when "View Details" is clicked. */
  onSelect?: (ticketNumber: string) => void;
}

const STAGE_LABELS: Record<string, string> = {
  caretaker: "Caretaker",
  deputy_warden: "Deputy Warden",
  hostel_manager: "Hostel Manager",
  warden_or_principal: "Warden / Principal",
  lab_incharge: "Lab In-charge",
  hod: "HOD",
  oie: "Officer in Exam (OIE)",
  vice_principal: "Vice Principal",
  principal: "Principal",
  completed: "Completed",
};

const WORKFLOW_BADGES: Record<string, { label: string; className: string }> = {
  hostel: { label: "Hostel", className: "bg-indigo-500/10 text-action-primary border border-indigo-500/20" },
  exam: { label: "Exam", className: "bg-teal-500/10 text-teal-500 border border-teal-500/20" },
  memo: { label: "Memo", className: "bg-violet-500/10 text-unit-c border border-violet-500/20" },
  staff_leave: { label: "Staff Leave", className: "bg-bg-elevated/10 text-text-muted border border-border/20" },
};

const STATUS_CLASSES: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-action-warning border border-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-action-success border border-emerald-500/20",
  REJECTED: "bg-rose-500/10 text-action-danger border border-rose-500/20",
  ESCALATED: "bg-orange-500/10 text-orange-500 border border-orange-500/20",
  COMPLETED: "bg-sky-500/10 text-sky-500 border border-sky-500/20",
};

/**
 * PermissionTicketCard — a purely presentational card summarizing one permission
 * ticket (number, workflow, status, stage, latest comment). It fetches nothing;
 * the parent list page owns the data and opens the detail panel on select.
 */
export function PermissionTicketCard({ ticket, onSelect }: PermissionTicketCardProps) {
  const workflow = WORKFLOW_BADGES[ticket.workflow_type] || {
    label: ticket.workflow_type,
    className: "bg-bg-elevated/10 text-text-muted border border-border/20",
  };
  const statusClass = STATUS_CLASSES[ticket.status] || "bg-bg-elevated/10 text-text-muted border border-border/20";
  const stageLabel = STAGE_LABELS[ticket.current_stage] || ticket.current_stage;
  const history = ticket.stage_history || [];
  const latest = history[history.length - 1];

  return (
    <div
      className="group bg-bg-surface border border-border rounded-xl p-4 transition-all duration-150 hover:bordertext-muted hover:shadow-sm"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-bg-elevated border border-border font-mono text-sm font-bold text-action-primary tracking-wide">
            {ticket.ticket_number}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${workflow.className}`}>
            {workflow.label}
          </span>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusClass}`}>
          {ticket.status}
        </span>
      </div>

      {/* Body */}
      <div className="mt-3 space-y-1.5 text-xs text-text-secondary">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-text-muted" />
          Stage: <span className="font-semibold text-text-primary">{stageLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 text-text-muted">
          <Clock className="w-3.5 h-3.5" />
          {formatDateTime(ticket.created_at)}
        </div>
        {ticket.document_required && (
          <div className="flex items-center gap-1.5 text-action-warning font-medium">
            <FileText className="w-3.5 h-3.5" />
            {ticket.document_url ? "Document attached" : "Document required"}
          </div>
        )}
        {latest?.comment && (
          <div className="flex items-start gap-1.5 pt-1 text-text-muted italic">
            <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="line-clamp-2">&ldquo;{latest.comment}&rdquo;</span>
          </div>
        )}
      </div>

      {/* Footer */}
      {onSelect && (
        <button
          type="button"
          onClick={() => onSelect(ticket.ticket_number)}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-action-primary hover:underline"
        >
          View Details
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
}

export default PermissionTicketCard;
