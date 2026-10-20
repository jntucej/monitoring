import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import {
  canApproveAtStage,
  canApproveAtStageWithBranch,
  resolveNextStage,
  appendStageHistory,
  getScopedTicket,
  requiresStepup,
  WORKFLOW_STAGES,
} from "@/lib/permission-workflow";
import {
  prepareHostelForward,
  applyHostelForward,
  prepareEscalateUp,
  applyEscalateUp,
  checkStepupPassword,
} from "@/lib/permission-forward";
import { addAudit, addNotification, getStudentGuardianLink } from "@/lib/db";
import { sendSMS } from "@/lib/integrations/sms";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import type { WorkflowType, Role } from "@/lib/types";

type Action = "APPROVE" | "REJECT" | "FORWARD" | "ESCALATE";
interface PatchBody {
  action?: Action;
  comment?: string;
  stepupPassword?: string;
  targetRole?: string;
  reason?: string;
}

function getTicket(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("permissions");
  return idx >= 0 ? parts[idx + 1] ?? "" : "";
}

async function handleGet(req: NextRequest): Promise<Response> {
  const ticket = getTicket(req);
  const scoped = await getScopedTicket(ticket, "", "");
  if ("notFound" in scoped) return fail("TICKET_NOT_FOUND", "Ticket not found", 404);
  if ("forbidden" in scoped) return fail("FORBIDDEN", "Not allowed", 403);
  return ok(scoped.request);
}

async function handlePatch(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const ticket = getTicket(req);
  if (!ticket) return fail("MISSING_TICKET", "ticket required", 400);

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const action = body.action;
  if (!action || !["APPROVE", "REJECT", "FORWARD", "ESCALATE"].includes(action)) {
    return fail("INVALID_ACTION", "action must be APPROVE|REJECT|FORWARD|ESCALATE", 400);
  }

  const scoped = await getScopedTicket(ticket, auth.userId, auth.role);
  if ("notFound" in scoped) return fail("TICKET_NOT_FOUND", "Ticket not found", 404);
  if ("forbidden" in scoped) return fail("FORBIDDEN", "Not allowed", 403);

  const row = scoped.request;
  const workflowType = row.workflow_type as WorkflowType;
  const currentStage = row.current_stage;

  if (row.status !== "PENDING" && row.status !== "ESCALATED") {
    return fail("TICKET_NOT_PENDING", `Ticket status is ${row.status}`, 409);
  }

  const actorBranch = auth.departmentId ?? null;
  const requesterBranch = (row as any).branch ?? null;
  const branchCheck = canApproveAtStageWithBranch(
    auth.role,
    workflowType,
    currentStage,
    actorBranch,
    requesterBranch,
  );
  if (!branchCheck) {
    return fail("STAGE_NOT_AUTHORIZED", `Role ${auth.role} cannot act on stage ${currentStage}`, 403);
  }

  const needsStepup = requiresStepup({
    actorRole: auth.role,
    action: action === "FORWARD" ? "forward" : "approve",
    reason: (row as any).reason,
    targetRole: body.targetRole,
  });

  let stepupVerified = false;
  if (needsStepup) {
    const outcome = await checkStepupPassword(
      auth.userId,
      auth.role,
      body.stepupPassword ?? "",
    );
    if (!outcome.ok) {
      return fail(outcome.code, outcome.message, outcome.failed ? 423 : 400);
    }
    stepupVerified = true;
  }

  if (action === "FORWARD") {
    return handleForward(req, auth, row, body, stepupVerified);
  }
  if (action === "ESCALATE") {
    return handleEscalate(req, auth, row);
  }

  const supabase = getSupabaseServiceClient();
  const now = new Date().toISOString();
  const nextStage = action === "APPROVE" ? resolveNextStage(workflowType, currentStage) : null;
  const newStatus =
    action === "REJECT"
      ? "REJECTED"
      : nextStage === null
        ? "COMPLETED"
        : "PENDING";
  const newCurrentStage = nextStage ?? currentStage;

  const updates: Record<string, unknown> = {
    status: newStatus,
    current_stage: newCurrentStage,
    stage_history: appendStageHistory(
      (row as any).stage_history,
      { id: auth.userId, name: auth.email ?? auth.userId, role: auth.role },
      action,
      body.comment ?? null,
      { from: currentStage, to: newCurrentStage },
    ),
    updated_at: now,
  };

  if (action === "APPROVE" && nextStage) {
    updates.routed_to_role = nextStage;
  }

  const { error: updErr } = await supabase
    .from("permissions")
    .update(updates)
    .eq("id", row.id);

  if (updErr) return fail("DB_ERROR", updErr.message, 500);

  await addAudit({
    action: action === "APPROVE" ? "PERMISSION_REQUEST_APPROVED" : "PERMISSION_REQUEST_REJECTED",
    userId: auth.userId,
    userName: auth.email ?? auth.userId,
    role: auth.role,
    details: JSON.stringify({
      ticket,
      fromStage: currentStage,
      toStage: newCurrentStage,
      status: newStatus,
      stepupVerified,
    }),
  });

  const studentUserId = (row as any).student_user_id ?? (row as any).requester_user_id;
  if (action === "APPROVE" && nextStage) {
    await notifyStage(nextStage, ticket, workflowType);
  } else {
    await addNotification(
      "user",
      studentUserId,
      "permission",
      action === "REJECT" ? "Request Rejected" : "Request Completed",
      `Ticket ${ticket} is now ${newStatus.toLowerCase()}`,
    );
  }

  if (
    newStatus === "COMPLETED" &&
    workflowType === "hostel" &&
    ["home_out", "day_pass"].includes((row as any).reason ?? "")
  ) {
    await notifyGuardianSMS(studentUserId, ticket, (row as any).reason);
  }

  return ok({
    ticket,
    action,
    status: newStatus,
    currentStage: newCurrentStage,
    stepupVerified,
  });
}

async function handleForward(
  _req: NextRequest,
  auth: AuthContext,
  row: any,
  body: PatchBody,
  stepupVerified: boolean,
): Promise<Response> {
  const prep = await prepareHostelForward({
    ticketParam: row.ticket_number,
    authUserId: auth.userId,
    authUserRole: auth.role,
    authUserEmail: auth.email,
    actorName: auth.email ?? auth.userId,
    body: {
      targetRole: body.targetRole,
      comment: body.comment,
      stepupPassword: body.stepupPassword,
    },
  });
  if (!prep.ok) {
    return prep.response ?? fail("FORWARD_FAILED", "Forward prep failed", 400);
  }
  const result = await applyHostelForward({
    ticket: prep.ticket!,
    actor: prep.actor!,
    targetRole: prep.targetRole!,
    comment: prep.comment ?? "",
    stepupVerified: stepupVerified || Boolean(prep.stepupVerified),
    authUserRole: auth.role,
    authUserEmail: auth.email,
    authUserId: auth.userId,
  });
  if ("response" in result && result.response) return result.response;
  return ok({
    ticket: row.ticket_number,
    action: "FORWARD",
    targetRole: prep.targetRole,
  });
}

async function handleEscalate(
  _req: NextRequest,
  auth: AuthContext,
  row: any,
): Promise<Response> {
  const prep = await prepareEscalateUp({
    ticketParam: row.ticket_number,
    authUserId: auth.userId,
    authUserRole: auth.role,
  });
  if (!prep.ok) return prep.response ?? fail("ESCALATE_FAILED", "Escalate failed", 400);
  const result = await applyEscalateUp({
    ticket: prep.ticket!,
    nextStage: prep.nextStage!,
    actor: { id: auth.userId, name: auth.email ?? auth.userId, role: auth.role },
    authUserEmail: auth.email,
    reason: "escalate",
  });
  if ("response" in result && result.response) return result.response;
  return ok({
    ticket: row.ticket_number,
    action: "ESCALATE",
    nextStage: prep.nextStage,
  });
}

async function notifyStage(
  stage: string,
  ticket: string,
  workflowType: WorkflowType,
): Promise<void> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM users WHERE role = $1 AND status = 'ACTIVE'`,
    [stage],
  );
  await Promise.all(
    rows.map((u) =>
      addNotification(
        "user",
        u.id,
        "permission",
        `Ticket ${ticket} ready for review`,
        `${workflowType} ticket awaiting your action`,
      ),
    ),
  );
}

async function notifyGuardianSMS(
  studentUserId: string,
  ticket: string,
  reason: string,
): Promise<void> {
  const guardianId = await getStudentGuardianLink(studentUserId);
  if (!guardianId) return;
  const { rows } = await query<{ phone: string | null }>(
    `SELECT phone FROM users WHERE id = $1 LIMIT 1`,
    [guardianId],
  );
  const phone = rows[0]?.phone;
  if (!phone) return;
  await sendSMS({
    to: phone,
    message: `Your ward's ${reason.replace("_", " ")} pass (${ticket}) has been approved.`,
  }).catch(() => undefined);
}

export const GET = withAuthorization(handleGet);
export const PATCH = withRateLimit(withAuthorization(handlePatch), {
  windowMs: 60_000,
  maxRequests: 60,
});
