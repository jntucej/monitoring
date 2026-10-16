import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import {
  canApproveAtStage,
  canApproveAtStageWithBranch,
  resolveNextStage,
  appendStageHistory,
  getScopedTicket,
  requiresStepup,
} from "@/lib/permission-workflow";
import {
  prepareHostelForward,
  applyHostelForward,
  prepareEscalateUp,
  applyEscalateUp,
  checkStepupPassword,
} from "@/lib/permission-forward";
import { addAudit, addNotification } from "@/lib/db";
import type { WorkflowType, Role } from "@/lib/types";

function getTicketFromReq(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] || "");
}

async function handleGet(req: NextRequest): Promise<Response> {
  const ticketParam = getTicketFromReq(req);
  const authUserId = req.headers.get("x-user-id") || "";
  const authUserRole = req.headers.get("x-user-role") || "";

  if (!ticketParam) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Ticket parameter required" } },
      { status: 400 }
    );
  }

  const scope = await getScopedTicket(ticketParam, authUserId, authUserRole);

  if ("notFound" in scope && scope.notFound) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Permission request not found" } },
      { status: 404 }
    );
  }

  if ("forbidden" in scope && scope.forbidden) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true, data: scope.request });
}

async function handlePatch(req: NextRequest): Promise<Response> {
  const ticketParam = getTicketFromReq(req);
  const authUserId = req.headers.get("x-user-id") || "";
  const authUserRole = req.headers.get("x-user-role") || "";
  const authUserEmail = req.headers.get("x-user-email") || "";

  if (!ticketParam) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Ticket parameter required" } },
      { status: 400 }
    );
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const {
    action,
    comment,
    digitalSignature,
    targetStage,
    stepupPassword,
    targetRole,
    reason,
    pendingHostelBlock,
    pendingRoomNumber,
    pendingWardenId,
  } = (body || {}) as {
    action?: string;
    comment?: string;
    digitalSignature?: string;
    targetStage?: string;
    stepupPassword?: string;
    targetRole?: string;
    reason?: string;
    pendingHostelBlock?: string;
    pendingRoomNumber?: string;
    pendingWardenId?: string;
  };

  const normalizedAction = (action || "").toUpperCase();
  const validActions = [
    "APPROVE",
    "REJECT",
    "ESCALATE",
    "ESCALATE_UP",
    "FORWARD",
    "REQUEST_INFO",
    "COMPLETE",
    "SIGN",
    "BIOMETRIC_HOSTEL",
    "BIOMETRIC_GATE",
    "CANCEL",
  ];

  if (!action || !validActions.includes(normalizedAction)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: `Invalid action. Must be one of: ${validActions.join(", ")}`,
        },
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();
  // Pre-fetch branch scoping for HODs (used by the L4 staff_leave guard below)
  const actorIsHod = authUserRole === "hod";
  const actorBranch = actorIsHod
    ? await (
        supabase.from("users").select("department_id").eq("id", authUserId).single()
      ).then(({ data }) => data?.department_id ?? null)
    : null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketParam);
  let q = supabase.from("permission_requests").select("*");
  if (isUuid) {
    q = q.or(`id.eq.${ticketParam},ticket_number.eq.${ticketParam}`);
  } else {
    q = q.eq("ticket_number", ticketParam);
  }

  const { data: request, error: fetchErr } = await q.single();

  if (fetchErr || !request) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Permission request not found" } },
      { status: 404 }
    );
  }

  // FORWARD: delegate to the shared hostel-forward helper (L2 layering).
  if (normalizedAction === "FORWARD") {
    const { data: actorRow } = await supabase.from("users").select("name").eq("id", authUserId).maybeSingle();
    const prep = await prepareHostelForward({
      ticketParam,
      authUserId,
      authUserRole,
      authUserEmail,
      actorName: actorRow?.name || authUserEmail || "Approver",
      body: { targetRole, comment, stepupPassword },
    });
    if (!prep.ok || prep.response) {
      return prep.response ?? NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Forward could not be prepared" } },
        { status: 400 },
      );
    }
    const result = await applyHostelForward({
      ticket: prep.ticket as NonNullable<typeof prep.ticket>,
      actor: prep.actor as NonNullable<typeof prep.actor>,
      targetRole: prep.targetRole as string,
      comment: prep.comment as string,
      stepupVerified: Boolean(prep.stepupVerified),
      authUserRole,
      authUserEmail,
      authUserId,
    });
    return result.response;
  }

  // ESCALATE_UP: student-initiated move to the next hostel level after a rejection.
  if (normalizedAction === "ESCALATE_UP") {
    const { data: actorRow } = await supabase.from("users").select("name").eq("id", authUserId).maybeSingle();
    const prep = await prepareEscalateUp({ ticketParam, authUserId, authUserRole });
    if (!prep.ok || prep.response) {
      return prep.response ?? NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Escalation could not be prepared" } },
        { status: 400 },
      );
    }
    const result = await applyEscalateUp({
      ticket: prep.ticket as NonNullable<typeof prep.ticket>,
      nextStage: prep.nextStage as string,
      actor: { id: authUserId, name: actorRow?.name || authUserEmail || "Approver", role: authUserRole },
      authUserEmail,
      reason,
    });
    return result.response;
  }

  if (normalizedAction === "CANCEL") {
    const isOwner =
      authUserId === request.requester_user_id ||
      authUserId === request.student_user_id ||
      ["admin", "sysadmin"].includes(authUserRole);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only the requester or student may cancel this request" } },
        { status: 403 }
      );
    }
    if (request.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: `Cannot cancel request with status ${request.status}. Only PENDING requests can be cancelled.` } },
        { status: 400 }
      );
    }
  } else {
    if (request.status === "REJECTED" || request.status === "COMPLETED" || request.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: `Cannot modify request with status ${request.status}` } },
        { status: 400 }
      );
    }

    const isAllowed = canApproveAtStage(authUserRole, request.workflow_type as WorkflowType, request.current_stage);
        if (!isAllowed) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "FORBIDDEN",
                message: `Role ${authUserRole} is not authorized to act at stage ${request.current_stage}`,
              },
            },
            { status: 403 }
          );
        }

        // HOD department scope check: HODs may only act on requests from students
        // in their own department. Admins and sysadmins are exempt.
        if (authUserRole === "hod") {
          const { data: studentData } = await supabase
            .from("users")
            .select("department_id")
            .eq("id", request.student_user_id)
            .single();
          const { data: hodData } = await supabase
            .from("users")
            .select("department_id")
            .eq("id", authUserId)
            .single();
          const studentDept = studentData?.department_id;
          const hodDept = hodData?.department_id;
          if (!studentDept || !hodDept || studentDept !== hodDept) {
            return NextResponse.json(
              { success: false, error: { code: "FORBIDDEN", message: "HOD may only approve requests from own department" } },
              { status: 403 }
            );
          }
        }

        if (request.workflow_type === "hostel" && ["caretaker", "deputy_warden"].includes(authUserRole)) {
      const { data: userData } = await supabase
        .from("users")
        .select("hostel_scope")
        .eq("id", authUserId)
        .single();
      if (userData?.hostel_scope && ["boys", "girls"].includes(userData.hostel_scope)) {
        if (request.hostel_scope && request.hostel_scope !== userData.hostel_scope) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: `Cannot act on ${request.hostel_scope} hostel request` } },
            { status: 403 }
          );
        }
      }
    }

    // L4: branch scoping — a HOD may only act on staff_leave requests in the
    // hod stage when their own branch matches the ticket's branch.
    // (The branch check itself lives in the pure engine as
    // canApproveAtStageWithBranch; the L4 layer only resolves the two branch
    // values and applies the gate — P4 layering rule.)
    if (!canApproveAtStageWithBranch(
      authUserRole,
      request.workflow_type as WorkflowType,
      request.current_stage,
      actorBranch,
      request.branch,
    )) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: `HOD of branch ${request.branch} required to act at the hod stage`,
          },
        },
        { status: 403 }
      );
    }
  }

  const { data: actorUser } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("id", authUserId)
    .single();

  const actorName = actorUser?.name || authUserEmail || "Approver";

  let nextStage = request.current_stage;
  let nextStatus = request.status;
  const updateFields: Record<string, unknown> = {};

  if (normalizedAction === "CANCEL") {
    nextStage = "cancelled";
    nextStatus = "CANCELLED";
  } else if (normalizedAction === "APPROVE" || normalizedAction === "FORWARD") {
    const resolvedNext = targetStage || resolveNextStage(request.workflow_type as WorkflowType, request.current_stage);
    if (!resolvedNext || resolvedNext === "completed") {
      nextStage = "completed";
      nextStatus = "APPROVED";
    } else {
      nextStage = resolvedNext;
      nextStatus = "PENDING";
    }
    // Persist the pre-assigned hostel room / warden fields when the
    // approver supplied them (day-scholar home_out approval flow).
    // These are written to the pending_* columns so the operator
    // entry-type write flow can move them onto student_details when the
    // student actually enters.
    if (pendingHostelBlock) updateFields.pending_hostel_block = pendingHostelBlock;
    if (pendingRoomNumber) updateFields.pending_room_number = pendingRoomNumber;
    if (pendingWardenId) updateFields.pending_warden_id = pendingWardenId;
  } else if (normalizedAction === "REJECT") {
    nextStatus = "REJECTED";
  } else if (normalizedAction === "ESCALATE") {
    nextStatus = "ESCALATED";
    if (targetStage) nextStage = targetStage;
  } else if (normalizedAction === "ESCALATE_UP") {
    // Handled above via the shared helper; defensive fallback only.
    nextStatus = "PENDING";
  } else if (normalizedAction === "COMPLETE") {
    nextStage = "completed";
    nextStatus = "COMPLETED";
  } else if (normalizedAction === "BIOMETRIC_HOSTEL") {
    updateFields.biometric_hostel_at = new Date().toISOString();
  } else if (normalizedAction === "BIOMETRIC_GATE") {
    updateFields.biometric_gate_at = new Date().toISOString();
    nextStage = "completed";
    nextStatus = "COMPLETED";
  } else if (normalizedAction === "SIGN") {
    if (!digitalSignature) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "digitalSignature payload is required for SIGN action" } },
        { status: 400 }
      );
    }
    updateFields.digital_signature = digitalSignature;
    await supabase.from("document_signatures").insert({
      document_id: request.id,
      signed_by: authUserId,
      signature_hash: digitalSignature,
    });
  }


  const updatedHistory = appendStageHistory(
    request.stage_history,
    { id: authUserId, name: actorName, role: authUserRole },
    normalizedAction,
    comment,
    { from: request.current_stage, to: nextStage }
  );

  updateFields.current_stage = nextStage;
  updateFields.status = nextStatus;
  updateFields.stage_history = updatedHistory;

  // APPROVE step-up gate: when the approval is flagged (reason emergency or
  // special_leave) the actor must verify the approval password. Verifies with
  // the shared lockout helper; audits PERMISSION_STEPUP_VERIFIED on success.
  if (normalizedAction === "APPROVE" && request.workflow_type === "hostel") {
    const ticketReason = typeof request.reason === "string" ? request.reason : undefined;
    const stepupNeeded = requiresStepup({
      actorRole: authUserRole,
      action: "approve",
      reason: ticketReason,
    });
    if (stepupNeeded) {
      const check = await checkStepupPassword(authUserId, authUserRole, stepupPassword);
      if (!check.ok) {
        return NextResponse.json(
          { success: false, error: { code: check.code, message: check.message } },
          { status: 403 },
        );
      }
      updateFields.stepup_verified_at = new Date().toISOString();
      updateFields.stepup_verified_by = authUserId;
      addAudit({
        action: "PERMISSION_STEPUP_VERIFIED",
        userId: authUserId,
        role: authUserRole as Role,
        details: { ticketNumber: request.ticket_number, reason: ticketReason },
      }).catch((err) => console.error("[Permission Ticket API] addAudit error:", err));
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from("permission_requests")
    .update(updateFields)
    .eq("id", request.id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message: updateErr.message } },
      { status: 500 }
    );
  }

  const auditAction =
    normalizedAction === "CANCEL" ? "PERMISSION_REQUEST_CANCELLED" :
    normalizedAction === "APPROVE" ? "PERMISSION_REQUEST_APPROVED" :
    normalizedAction === "REJECT" ? "PERMISSION_REQUEST_REJECTED" :
    normalizedAction === "FORWARD" ? "PERMISSION_REQUEST_FORWARDED" :
    normalizedAction === "ESCALATE" ? "PERMISSION_REQUEST_ESCALATED" :
    normalizedAction === "ESCALATE_UP" ? "PERMISSION_REQUEST_ESCALATED" :
    normalizedAction === "COMPLETE" ? "PERMISSION_REQUEST_COMPLETED" :
    normalizedAction === "SIGN" ? "PERMISSION_DOCUMENT_SIGNED" :
    normalizedAction.startsWith("BIOMETRIC_") ? "PERMISSION_BIOMETRIC_VERIFIED" :
    `PERMISSION_REQUEST_${normalizedAction}`;

  addAudit({
    action: auditAction as any,
    userId: authUserId,
    role: authUserRole as Role,
    details: {
      ticketNumber: request.ticket_number,
      action: normalizedAction,
      fromStage: request.current_stage,
      toStage: nextStage,
      status: nextStatus,
      comment,
    },
  }).catch((err) => console.error("[Permission Ticket API] addAudit error:", err));

  addNotification(
    "user",
    request.student_user_id,
    "permission",
    `Permission Request ${request.ticket_number} Updated`,
    `Your request ${request.ticket_number} was marked ${normalizedAction} (Status: ${nextStatus}, Stage: ${nextStage})`
  ).catch((err) => console.error("[Permission Ticket API] addNotification error:", err));

  return NextResponse.json({ success: true, data: updated });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "permission_ticket_get",
  maxRequests: 100,
});

export const PATCH = withRateLimit(withAuthorization(handlePatch), {
  keyPrefix: "permission_ticket_patch",
  maxRequests: 60,
});

export const POST = withRateLimit(withAuthorization(handlePatch), {
  keyPrefix: "permission_ticket_post",
  maxRequests: 60,
});

