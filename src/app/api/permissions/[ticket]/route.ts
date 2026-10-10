/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit, addNotification } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { canApproveAtStage, appendStageHistory, resolveNextStage, WorkflowType } from "@/lib/permission-workflow";

async function getHandler(req: NextRequest, context: any) {
  const ticket = context.params?.ticket;
  const db = getSupabaseServiceClient();

  const { data, error } = await db.from("permissions").select("*").eq("ticket_number", ticket).single();
  if (error || !data) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, data });
}

async function patchHandler(req: NextRequest, context: any) {
  const ticket = context.params?.ticket;
  const { auth: { userId, role } } = context;
  const db = getSupabaseServiceClient();
  const body = await req.json();
  const { action, comment } = body; 

  if (!action) return NextResponse.json({ success: false, error: "Missing action" }, { status: 400 });

  const { data: request, error: fetchErr } = await db.from("permissions").select("*").eq("ticket_number", ticket).single();
  if (fetchErr || !request) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  if (request.status !== "PENDING" && request.status !== "ESCALATED") {
    return NextResponse.json({ success: false, error: "Ticket is not pending" }, { status: 400 });
  }

  const { workflow_type, current_stage, stage_history } = request;

  if (!canApproveAtStage(role, workflow_type as WorkflowType, current_stage)) {
    return NextResponse.json({ success: false, error: "Unauthorized for this stage" }, { status: 403 });
  }

  let newStatus = request.status;
  let newStage = current_stage;

  if (action === "approve" || action === "forward") {
    const nextStage = resolveNextStage(workflow_type as WorkflowType, current_stage);
    if (!nextStage) {
      newStatus = "COMPLETED";
      newStage = "completed";
    } else {
      newStage = nextStage;
    }
  } else if (action === "reject") {
    newStatus = "REJECTED";
  } else if (action === "complete") {
    newStatus = "COMPLETED";
    newStage = "completed";
  } else {
    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  }

  const newHistory = appendStageHistory(stage_history, userId, action, comment);

  const { data: updated, error: updateErr } = await db.from("permissions").update({
    current_stage: newStage,
    status: newStatus,
    stage_history: newHistory,
    updated_at: new Date().toISOString()
  }).eq("ticket_number", ticket).select().single();

  if (updateErr) return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
  
  await addAudit({ action: `PERMISSION_${action.toUpperCase()}`, userId, role, details: { ticket, comment, newStage, newStatus } });
  
  if (newStatus === "REJECTED" || newStatus === "COMPLETED") {
    await addNotification("user", request.user_id, `permission_${newStatus.toLowerCase()}`, `Your request ${ticket} was ${newStatus.toLowerCase()}`, `Comment: ${comment || ""}`);
  }

  return NextResponse.json({ success: true, data: updated });
}

export const GET = withRateLimit(
  withAuthorization(getHandler),
  { keyPrefix: "perm_tic_get", maxRequests: 50 }
);

export const PATCH = withRateLimit(
  withAuthorization(patchHandler, { requiredRole: ["caretaker", "deputy_warden", "hostel_manager", "warden", "principal", "faculty", "hod", "oie", "vice_principal", "operator", "admin", "sysadmin"] }),
  { keyPrefix: "perm_tic_patch", maxRequests: 20 }
);