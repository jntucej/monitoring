/* -----------------------------------------------------------------* *
 * BULK PERMISSION ACTIONS — shared helper called by bulk route and
 * single-ticket PATCH handler.
 * -----------------------------------------------------------------* */

import type { Role, WorkflowType } from "@/lib/types";
import {
  resolveNextStage,
  appendStageHistory,
  canApproveAtStage,
} from "./permission-workflow";
import { getSupabaseServiceClient } from "@/lib/dbClient";

export interface Actor {
  id: string;
  name: string;
  role: Role;
}

export interface TicketRow {
  id: string;
  ticket_number: string;
  workflow_type: WorkflowType;
  student_user_id: string;
  current_stage: string;
  status: string;
  hostel_scope?: string | null;
  stage_history: unknown[] | null;
  biometric_hostel_at?: string | null;
  biometric_gate_at?: string | null;
  updated_at: string;
  created_at: string;
}

export interface BulkResult {
  ticket: string;
  status:
    | "ok"
    | "not_found"
    | "forbidden"
    | "not_pending"
    | "error"
    | "not_allowed"
    | "skipped";
  error?: string;
  newStage?: string;
}

export interface ApplyActionOptions {
  action: string;
  actor: Actor;
  comment?: string | null;
  targetStage?: string;
  ticketRow: TicketRow;
}

/**
 * Returns `{ ok, conflict }`. `conflict` is set when caller can see the
 * ticket (scope) but cannot act on its current stage (e.g. the row is
 * already APPROVED/COMPLETED or the role is not allowed there). The bulk route
 * treats `conflict` + `notFound`/`notPending`/`forbidden` as a per-ticket
 * non-ok result.
 */
export async function validateAndApplyAction(
  options: ApplyActionOptions,
  extraComment?: string | null
): Promise<{
  ok: boolean;
  conflict?: "notFound" | "forbidden" | "notPending" | "notAllowed" | "concurrentModification";
  error?: string;
  newStage?: string;
  newStatus?: string;
  updatedRow?: unknown;
}> {
  const { action, actor, targetStage, ticketRow: row } = options;
  const comment = extraComment !== undefined ? extraComment : options.comment;

  // Check stage permission
  if (!canApproveAtStage(actor.role, row.workflow_type, row.current_stage)) {
    return {
      ok: false,
      conflict: "forbidden",
      error: `Role ${actor.role} is not authorized to act on stage ${row.current_stage}`,
    };
  }

  if (row.status !== "PENDING") {
    return {
      ok: false,
      conflict: "notPending",
      error: `Cannot act on a request with status ${row.status}`,
    };
  }

  const normalizedAction = action.toUpperCase();
  let nextStage = row.current_stage;
  let nextStatus = row.status;

  if (normalizedAction === "APPROVE" || normalizedAction === "FORWARD") {
    const resolvedNext = resolveNextStage(row.workflow_type, row.current_stage);
    if (!resolvedNext || resolvedNext === "completed") {
      nextStage = "completed";
      nextStatus = "APPROVED";
    } else {
      nextStage = resolvedNext;
      nextStatus = "PENDING";
    }
  } else if (normalizedAction === "REJECT") {
    nextStatus = "REJECTED";
  } else if (normalizedAction === "ESCALATE") {
    nextStage =
      targetStage ||
      resolveNextStage(row.workflow_type, row.current_stage) ||
      "completed";
    nextStatus = "PENDING";
  } else if (normalizedAction === "COMPLETE") {
    nextStage = "completed";
    nextStatus = "APPROVED";
  } else {
    return {
      ok: false,
      conflict: "notAllowed",
      error: `Action ${action} is not recognized`,
    };
  }

  const updatedHistory = appendStageHistory(
    row.stage_history,
    actor,
    action,
    comment,
    { from: row.current_stage, to: nextStage }
  );

  const supabase = getSupabaseServiceClient();
  // G18: CAS guard — only apply if the row is still at the stage we read.
  // Same pattern as PATCH /api/permissions/[ticket]; prevents two bulk
  // approvers from silently clobbering each other's stage_history entries.
  const { data: updated, error: updateErr } = await supabase
    .from("permission_requests")
    .update({
      current_stage: nextStage,
      status: nextStatus,
      stage_history: updatedHistory,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("current_stage", row.current_stage)  // CAS
    .select()
    .single();

  if (updateErr) {
    return {
      ok: false,
      error: updateErr.message,
    };
  }

  // G18: zero-row update → concurrent modification
  if (!updated) {
    return {
      ok: false,
      conflict: "concurrentModification",
      error: `Ticket ${row.ticket_number} was modified by another approver.`,
    };
  }

  return {
    ok: true,
    newStage: nextStage,
    newStatus: nextStatus,
    updatedRow: updated,
  };
}

export { appendStageHistory };
