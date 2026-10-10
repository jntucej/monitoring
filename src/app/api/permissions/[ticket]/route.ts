import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import {
  canApproveAtStage,
  resolveNextStage,
  appendStageHistory,
} from "@/lib/permission-workflow";
import { addAudit, addNotification, getParentChildren } from "@/lib/db";
import type { WorkflowType } from "@/lib/types";

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

  const supabase = getSupabaseServiceClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketParam);

  let q = supabase
    .from("permission_requests")
    .select(
      `
      *,
      student:student_user_id (
        id,
        name,
        email,
        phone,
        role,
        student_details (
          roll,
          year,
          section,
          hostel_block,
          room_number,
          gender
        )
      ),
      document_signatures (
        id,
        signed_by,
        signed_at,
        signature_hash
      )
    `
    );

  if (isUuid) {
    q = q.or("id.eq." + ticketParam + ",ticket_number.eq." + ticketParam);
  } else {
    q = q.eq("ticket_number", ticketParam);
  }

  const { data: request, error } = await q.single();

  if (error || !request) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Permission request not found" } },
      { status: 404 }
    );
  }

  if (authUserRole === "student" && request.student_user_id !== authUserId) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
      { status: 403 }
    );
  }

  if (authUserRole === "parent" || authUserRole === "guardian") {
    const children = await getParentChildren(authUserId);
    const isChild = (children || []).some((c: { id?: string }) => c.id === request.student_user_id);
    if (!isChild) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({ success: true, data: request });
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

  const { action, comment, digitalSignature, targetStage } = (body || {}) as {
    action?: string;
    comment?: string;
    digitalSignature?: string;
    targetStage?: string;
  };

  const validActions = [
    "APPROVE",
    "REJECT",
    "ESCALATE",
    "FORWARD",
    "REQUEST_INFO",
    "COMPLETE",
    "SIGN",
    "BIOMETRIC_HOSTEL",
    "BIOMETRIC_GATE",
  ];

  if (!action || !validActions.includes(action)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid action. Must be one of: " + validActions.join(", "),
        },
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketParam);
  let q = supabase.from("permission_requests").select("*");
  if (isUuid) {
    q = q.or("id.eq." + ticketParam + ",ticket_number.eq." + ticketParam);
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

  if (request.status === "REJECTED" || request.status === "COMPLETED") {
    return NextResponse.json(
      { success: false, error: { code: "BAD_REQUEST", message: "Cannot modify a request with status " + request.status } },
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
          message: "Role " + authUserRole + " is not authorized to act on stage " + request.current_stage,
        },
      },
      { status: 403 }
    );
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
          { success: false, error: { code: "FORBIDDEN", message: "Cannot act on " + request.hostel_scope + " hostel request" } },
          { status: 403 }
        );
      }
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

  if (action === "APPROVE" || action === "FORWARD") {
    const resolvedNext = targetStage || resolveNextStage(request.workflow_type as WorkflowType, request.current_stage);
    if (!resolvedNext || resolvedNext === "completed") {
      nextStage = "completed";
      nextStatus = "APPROVED";
    } else {
      nextStage = resolvedNext;
      nextStatus = "PENDING";
    }
  } else if (action === "REJECT") {
    nextStatus = "REJECTED";
  } else if (action === "ESCALATE") {
    nextStatus = "ESCALATED";
    if (targetStage) nextStage = targetStage;
  } else if (action === "COMPLETE") {
    nextStage = "completed";
    nextStatus = "COMPLETED";
  } else if (action === "BIOMETRIC_HOSTEL") {
    updateFields.biometric_hostel_at = new Date().toISOString();
  } else if (action === "BIOMETRIC_GATE") {
    updateFields.biometric_gate_at = new Date().toISOString();
    if (request.current_stage === "main_gate") {
      nextStage = "completed";
      nextStatus = "COMPLETED";
    }
  } else if (action === "SIGN") {
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
    action,
    comment,
    { from: request.current_stage, to: nextStage }
  );

  updateFields.current_stage = nextStage;
  updateFields.status = nextStatus;
  updateFields.stage_history = updatedHistory;

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

  addAudit({
    action: "PERMISSION_REQUEST_" + action,
    userId: authUserId,
    details: {
      ticketNumber: request.ticket_number,
      action,
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
    "Permission Request " + request.ticket_number + " Updated",
    "Your request " + request.ticket_number + " was marked as " + action + " (Status: " + nextStatus + ", Stage: " + nextStage + ")"
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
