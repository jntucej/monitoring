import { errMsg, errCode } from "@/lib/err-msg";
import { NextRequest } from "next/server";

import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import {canApproveAtStageWithBranch, resolveNextStage, appendStageHistory, getScopedTicket, requiresStepup, type RequestSnapshot}  from "@/lib/permission-workflow";
import {
  prepareHostelForward,
  applyHostelForward,
  prepareEscalateUp,
  applyEscalateUp,
  checkStepupPassword,
} from "@/lib/permission-forward";
import { addAudit, addNotification, getStudentGuardianLink } from "@/lib/db";
import { enqueueTemplatedSms } from "@/lib/sms-templates";
import { query, withTransaction } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import type { WorkflowType } from "@/lib/types";

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
  const requesterBranch = row.branch ?? null;
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
    reason: row.reason ?? undefined,
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
      row.stage_history,
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

  let updErr: string | null = null;
  try {
    const res = await withTransaction(
      async (tx) =>
        tx.query(
          `UPDATE public.permissions
            SET status = $1,
                current_stage = $2,
                stage_history = $3::jsonb,
                updated_at = $4,
                routed_to_role = COALESCE($5, routed_to_role)
          WHERE id = $6::uuid
          RETURNING id`,
          [
            newStatus,
            newCurrentStage,
            JSON.stringify((updates as Record<string, unknown>).stage_history),
            now,
            (action === "APPROVE" && nextStage) ? nextStage : null,
            row.id,
          ],
        ),
      { currentUserId: row.requester_user_id ?? auth.userId, currentRole: auth.role }
    );
    if (res.rowCount === 0) {
      updErr = "RLS policy did not permit the status update (0 rows affected)";
    }
  } catch (e) {
    updErr = errMsg(e) ?? "unknown DB error";
    if (errCode(e) === "42501") console.error("[permissions PATCH] RLS blocked update", errMsg(e));
    else console.error("[permissions PATCH] DB error", errMsg(e));
  }

  if (updErr) return fail("DB_ERROR", updErr, 500);

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

  const studentUserId = row.student_user_id ?? row.requester_user_id;
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
    ["home_out", "day_pass"].includes(row.reason ?? "")
  ) {
    await notifyGuardianSMS(studentUserId, ticket, row.reason ?? "");
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
  row: RequestSnapshot,
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
  row: RequestSnapshot,
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
  // Fetch student + guardian details for the templated SMS vars
  const { rows: stuRows } = await query<{ name: string; phone: string | null; unique_id: string | null }>(
    `SELECT name, phone, unique_id FROM users WHERE id = $1 LIMIT 1`,
    [studentUserId]
  );
  const stu = stuRows[0];
  const guardianId = await getStudentGuardianLink(studentUserId);
  if (!guardianId) return;
  const { rows } = await query<{ phone: string | null }>(
    `SELECT phone FROM users WHERE id = $1 LIMIT 1`,
    [guardianId]
  );
  const phone = rows[0]?.phone;
  if (!phone) return;

  const date = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
  const vars = {
    name: stu?.name ?? "your ward",
    reason: reason.replace(/_/g, " "),
    date,
    ticket,
  };

  // Student SMS (if they have a phone)
  if (stu?.phone) {
    await enqueueTemplatedSms({
      templateCode: "pass_approved",
      to: stu.phone,
      vars,
      priority: "urgent",
    }).catch(() => undefined);
  }
  // Guardian SMS
  await enqueueTemplatedSms({
    templateCode: "pass_approved",
    to: phone,
    vars,
    priority: "urgent",
  }).catch(() => undefined);
}

export const GET = withAuthorization(handleGet);
export const PATCH = withRateLimit(withAuthorization(handlePatch), {
  windowMs: 60_000,
  maxRequests: 60,
});
