"use client";

import React from "react";
import { Check, Eye, Clock, Shield, User, Building, FileText } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { SlaBadge } from "./SlaBadge";
import type { PermissionStatus, WorkflowType } from "@/lib/types";

export interface PermissionItem {
  id: string;
  ticket_number: string;
  workflow_type: WorkflowType;
  student_user_id: string;
  hostel_scope?: "boys" | "girls" | null;
  current_stage: string;
  status: PermissionStatus;
  /** Request reason (e.g. home_out, day_pass, daily_outing, day_scholar_out). */
  reason?: string | null;
  /** True when the pass was generated directly, bypassing the staged chain. */
  direct_generated?: boolean | null;
  /** Pending hostel room-assignment fields (day_scholar home_out flow). */
  pending_hostel_block?: string | null;
  pending_room_number?: string | null;
  pending_warden_id?: string | null;
  /** Current hostel level the ticket is routed to (forward target / stage). */
  routed_to_role?: string | null;
  /** Set when this ticket was forwarded from a lower level. */
  forwarded_from_role?: string | null;
  /** Forwarder's comment explaining the handoff. */
  forward_comment?: string | null;
  stage_history: Array<{
    actorId: string;
    actorName: string;
    actorRole: string;
    action: string;
    fromStage?: string;
    toStage?: string;
    comment?: string | null;
    timestamp: string;
  }>;
  document_required: boolean;
  document_url?: string | null;
  biometric_hostel_at?: string | null;
  biometric_gate_at?: string | null;
  digital_signature?: string | null;
  created_at: string;
  updated_at: string;
  sla_deadline?: string | null;
  from_date?: string | null;
  to_date?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  student?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    student_details?: {
      roll?: string;
      year?: number;
      section?: string;
      hostel_block?: string;
      room_number?: string;
      gender?: string;
      /** Live entry-type selection (student_details.current_entry_type). */
      current_entry_type?: "hosteller" | "day_scholar" | null;
      currentEntryType?: "hosteller" | "day_scholar" | null;
    };
  } | null;
  document_signatures?: Array<{
    id: string;
    signed_by: string;
    signed_at: string;
    signature_hash?: string;
  }>;
}

interface PermissionRowProps {
  request: PermissionItem;
  isSelected: boolean;
  onToggleSelect: (ticket: string) => void;
  onViewDetails: (ticket: string) => void;
  onQuickApprove?: (ticket: string) => void;
  onQuickReject?: (ticket: string) => void;
  loadingAction?: boolean;
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
};

export function PermissionRow({
  request,
  isSelected,
  onToggleSelect,
  onViewDetails,
  onQuickApprove,
  onQuickReject,
  loadingAction = false,
}: PermissionRowProps) {
  const student = request.student;
  const details = student?.student_details;
  const isPending = request.status === "PENDING";

  return (
    <div
      className={`group relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border transition-all duration-150 ${
        isSelected
          ? "bg-action-primary/5 border-action-primary shadow-sm"
          : "bg-bg-surface border-border hover:bordertext-muted hover:shadow-sm"
      }`}
    >
      <div className="flex items-start md:items-center gap-3 w-full md:w-auto">
        <button
          type="button"
          onClick={() => onToggleSelect(request.ticket_number)}
          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 mt-0.5 md:mt-0 ${
            isSelected
              ? "bg-action-primary border-action-primary text-white"
              : "border-border bg-bg-elevated hover:bordertext-muted"
          }`}
          aria-label={`Select ${request.ticket_number}`}
        >
          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        <div className="space-y-1 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="surface-card font-mono text-xs font-bold px-2 py-0.5 bg-bg-elevated text-action-primary">
              {request.ticket_number}
            </span>
            <span className="font-semibold text-sm text-text-primary">
              {student?.name || "Unknown Student"}
            </span>
            {details?.roll && (
              <span className="text-xs text-text-muted font-mono">
                ({details.roll})
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                request.status === "PENDING"
                  ? "bg-amber-500/10 text-action-warning border border-amber-500/20"
                  : request.status === "APPROVED"
                  ? "bg-emerald-500/10 text-action-success border border-emerald-500/20"
                  : request.status === "REJECTED"
                  ? "bg-rose-500/10 text-action-danger border border-rose-500/20"
                  : "bg-blue-500/10 text-action-primary border border-blue-500/20"
              }`}
            >
              {request.status}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
            {details?.year && details?.section && (
              <span className="flex items-center gap-1">
                <User className="size-3.5 text-text-muted" />
                Year {details.year} - Sec {details.section}
              </span>
            )}
            {details?.hostel_block && (
              <span className="flex items-center gap-1">
                <Building className="size-3.5 text-text-muted" />
                Block {details.hostel_block} ({details.room_number || "—"})
              </span>
            )}
            <span className="flex items-center gap-1">
              <Shield className="size-3.5 text-text-muted" />
              Stage: {STAGE_LABELS[request.current_stage] || request.current_stage}
            </span>
            {request.document_required && (
              <span className="flex items-center gap-1 text-action-warning font-medium">
                <FileText className="size-3.5" />
                Doc Req
              </span>
            )}
            <span className="flex items-center gap-1 text-text-muted">
              <Clock className="size-3.5" />
              {formatDateTime(request.created_at)}
            </span>
            <SlaBadge slaDeadline={request.sla_deadline} status={request.status} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
        {isPending && onQuickApprove && (
          <button
            type="button"
            onClick={() => onQuickApprove(request.ticket_number)}
            disabled={loadingAction}
            className="surface-card px-3 py-1.5 text-xs font-semibold bg-action-success hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {isPending && onQuickReject && (
          <button
            type="button"
            onClick={() => onQuickReject(request.ticket_number)}
            disabled={loadingAction}
            className="surface-card px-3 py-1.5 text-xs font-semibold bg-action-danger hover:bg-rose-700 text-white transition-colors disabled:opacity-50"
          >
            Reject
          </button>
        )}
        <button
          type="button"
          onClick={() => onViewDetails(request.ticket_number)}
          className="surface-card p-1.5 bg-bg-elevated hover:bg-bg-surface text-text-secondary hover:text-text-primary transition-colors"
          title="View full details"
          aria-label="View full details"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
