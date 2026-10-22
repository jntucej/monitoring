/**
 * permission-forward.ts
 *
 * Orchestrates hostel-permission forwards and step-up authentication.
 */
import { query } from "@/lib/postgres";
import { verifyPassword, hashPassword } from "@/lib/auth-token";
import { forwardTicket, type ForwardTicketResult } from "@/lib/permission-workflow-pure";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { addAudit, addNotification } from "@/lib/db";
import type { Role } from "@/lib/types";
import { NextResponse } from "next/server";

export const DIRECT_GENERATE_ROLES: Role[] = [
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "principal",
  "admin",
  "sysadmin",
];

export const APPROVAL_PASSWORD_MIN_LENGTH = 12;

export async function hashApprovalPassword(pw: string): Promise<string> {
  return hashPassword(pw);
}

export async function validateApprovalPasswordPolicy(
  pw: string,
  loginHash?: string | null,
  currentHash?: string | null
): Promise<{ code: string; message: string } | null> {
  if (!pw || pw.length < APPROVAL_PASSWORD_MIN_LENGTH) {
    return { code: "WEAK_PASSWORD", message: `Password must be at least ${APPROVAL_PASSWORD_MIN_LENGTH} characters long.` };
  }
  if (loginHash && (await verifyPassword(pw, loginHash))) {
    return { code: "PASSWORD_MATCHES_LOGIN", message: "Approval password cannot match your login password." };
  }
  if (currentHash && (await verifyPassword(pw, currentHash))) {
    return { code: "PASSWORD_MATCHES_CURRENT", message: "New approval password must be different from current approval password." };
  }
  return null;
}

export interface StepupOutcome {
  ok: boolean;
  code: string;
  message: string;
  failed?: boolean;
}

export async function checkStepupPassword(
  userId: string,
  role: Role | string,
  password: string = ""
): Promise<StepupOutcome> {
  if (!password) {
    return { ok: false, code: "STEPUP_PASSWORD_REQUIRED", message: "Approval password required" };
  }
  const { rows } = await query<{ approval_password_hash: string | null }>(
    `SELECT approval_password_hash FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  const hash = rows[0]?.approval_password_hash;
  if (!hash) {
    return { ok: false, code: "APPROVAL_PASSWORD_NOT_SET", message: "Approval password not set for this account" };
  }
  const valid = await verifyPassword(password, hash);
  if (!valid) {
    await addAudit({
      action: "PERMISSION_STEPUP_FAILED",
      userId,
      role: String(role) as Role,
      details: JSON.stringify({ reason: "incorrect_approval_password" }),
    });
    return { ok: false, code: "INVALID_APPROVAL_PASSWORD", message: "Incorrect approval password", failed: true };
  }
  return { ok: true, code: "OK", message: "Success" };
}

export async function prepareHostelForward(args: {
  ticketParam: string;
  authUserId: string;
  authUserRole: string;
  authUserEmail?: string;
  actorName: string;
  body: { targetRole?: string; comment?: string; stepupPassword?: string };
}) {
  const { getScopedTicket } = await import("@/lib/permission-workflow");
  const scoped = await getScopedTicket(args.ticketParam, args.authUserId, args.authUserRole);
  if ("notFound" in scoped) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Ticket not found" } }, { status: 404 }) };
  }
  if ("forbidden" in scoped) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Not allowed" } }, { status: 403 }) };
  }
  const ticket = scoped.request;
  const targetRole = args.body.targetRole;
  const comment = args.body.comment;
  if (!targetRole) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: { code: "MISSING_TARGET", message: "targetRole required" } }, { status: 400 }) };
  }
  if (!comment || !comment.trim()) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: { code: "COMMENT_REQUIRED", message: "Forward comment is required" } }, { status: 400 }) };
  }
  return {
    ok: true as const,
    ticket,
    actor: { id: args.authUserId, name: args.actorName, role: args.authUserRole },
    targetRole,
    comment,
    stepupVerified: false,
  };
}

export async function applyHostelForward(args: {
  ticket: any;
  actor: { id: string; name: string; role: string };
  targetRole: string;
  comment: string;
  stepupVerified: boolean;
  authUserRole: string;
  authUserEmail?: string;
  authUserId: string;
}): Promise<{ ok: boolean; response?: NextResponse }> {
  let result: ForwardTicketResult;
  try {
    result = forwardTicket({
      ticket: args.ticket,
      actor: args.actor,
      targetRole: args.targetRole,
      comment: args.comment,
      stepupVerified: args.stepupVerified,
    });
  } catch (err: any) {
    const code = err.code ?? "FORWARD_RULE_ERROR";
    const status = code === "STEPUP_REQUIRED" ? 400 : 422;
    return { ok: false, response: NextResponse.json({ success: false, error: { code, message: err.message } }, { status }) };
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("permissions")
    .update(result.updates)
    .eq("id", args.ticket.id);

  if (error) {
    return { ok: false, response: NextResponse.json({ success: false, error: { code: "DB_ERROR", message: error.message } }, { status: 500 }) };
  }

  await addAudit({
    action: result.effects.auditAction,
    userId: args.authUserId,
    userName: args.authUserEmail ?? args.authUserId,
    role: args.authUserRole as Role,
    details: JSON.stringify({ ticket: args.ticket.ticket_number, targetRole: args.targetRole, comment: args.comment }),
  });

  if (result.effects.notifyUserId) {
    await addNotification(
      "user",
      result.effects.notifyUserId,
      "permission",
      "Ticket Forwarded",
      result.effects.notifyMessage ?? "Your ticket has been forwarded"
    );
  }

  return { ok: true };
}

export async function prepareEscalateUp(args: {
  ticketParam: string;
  authUserId: string;
  authUserRole: string;
}) {
  const { getScopedTicket } = await import("@/lib/permission-workflow");
  const scoped = await getScopedTicket(args.ticketParam, args.authUserId, args.authUserRole);
  if ("notFound" in scoped) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Ticket not found" } }, { status: 404 }) };
  }
  if ("forbidden" in scoped) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: { code: "FORBIDDEN", message: "Not allowed" } }, { status: 403 }) };
  }
  const ticket = scoped.request;
  const currentStage = ticket.current_stage;
  const { resolveNextStage } = await import("@/lib/permission-workflow");
  const nextStage = resolveNextStage(ticket.workflow_type, currentStage);
  if (!nextStage) {
    return { ok: false as const, response: NextResponse.json({ success: false, error: { code: "CANNOT_ESCALATE", message: "Ticket is already at final stage" } }, { status: 400 }) };
  }
  return { ok: true as const, ticket, nextStage };
}

export async function applyEscalateUp(args: {
  ticket: any;
  nextStage: string;
  actor: { id: string; name: string; role: string };
  authUserEmail?: string;
  reason?: string;
}) {
  const supabase = getSupabaseServiceClient();
  const { appendStageHistory } = await import("@/lib/permission-workflow");
  const history = appendStageHistory(
    args.ticket.stage_history,
    args.actor,
    "ESCALATE",
    args.reason ?? "Escalated by supervisor",
    { from: args.ticket.current_stage, to: args.nextStage }
  );

  const { error } = await supabase
    .from("permissions")
    .update({
      current_stage: args.nextStage,
      routed_to_role: args.nextStage,
      stage_history: history,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.ticket.id);

  if (error) {
    return { ok: false, response: NextResponse.json({ success: false, error: { code: "DB_ERROR", message: error.message } }, { status: 500 }) };
  }

  await addAudit({
    action: "PERMISSION_ESCALATED",
    userId: args.actor.id,
    userName: args.authUserEmail ?? args.actor.id,
    role: args.actor.role as Role,
    details: JSON.stringify({ ticket: args.ticket.ticket_number, nextStage: args.nextStage }),
  });

  return { ok: true };
}
