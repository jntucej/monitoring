// src/lib/permission-forward.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers for the hostel-permission-hierarchy surfaces:
//   - step-up approval-password verification with lockout (used by the
//     forward, direct-generate, and single-ticket APPROVE routes)
//   - the hostel forward persistence flow (wraps the pure forwardTicket)
//   - the student-initiated ESCALATE_UP flow
//
// The pure decision logic lives in permission-workflow.ts; this module only
// adds the L4 (HTTP/DB) plumbing: users-row stepup lockout, ticket updates,
// audit and notifications. It reuses addAudit / addNotification from db.ts
// (never raw INSERT into audit_logs).
// ─────────────────────────────────────────────────────────────────────────────

import { getSupabaseServiceClient } from "@/lib/dbClient";
import { hashPassword, verifyPassword } from "@/lib/auth-token";
import { addAudit, addNotification } from "@/lib/db";
import { NextResponse } from "next/server";
import {
  forwardTicket,
  getScopedTicket,
  nextHostelLevel,
  requiresStepup,
  appendStageHistory,
  type ActorContext,
  type RequestSnapshot,
  type ScopedTicketRow,
  type StageHistoryEntry,
} from "@/lib/permission-workflow";
import type { Role } from "@/lib/types";

/** Approver-tier roles that may forward / act on hostel tickets. */
export const APPROVER_FORWARD_ROLES: readonly string[] = [
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "principal",
  "sysadmin",
  "admin",
];

/** L2..L4: the roles that may direct-generate a pass (caretaker excluded). */
export const DIRECT_GENERATE_ROLES: readonly string[] = [
  "deputy_warden",
  "hostel_manager",
  "principal",
  "sysadmin",
  "admin",
];

/** Minimum length for an approval password. */
export const APPROVAL_PASSWORD_MIN_LENGTH = 8;
/** Consecutive failures before the approval password is locked. */
export const STEPUP_MAX_FAILURES = 5;
/** Lockout window after STEPUP_MAX_FAILURES consecutive failures. */
export const STEPUP_LOCKOUT_MINUTES = 15;

/** Roles with full control that are exempt from the L4 principal forward ban. */
const SYSADMIN_LIKE = new Set(["sysadmin", "admin"]);

export interface StepupCheckOutcome {
  /** true when the password was verified (or no password is required). */
  ok: boolean;
  /** 403 when locked out or the password is missing/wrong. */
  code: string;
  message: string;
  /** Set when the request failed and the caller must surface 403. */
  failed?: boolean;
}

interface UserStepupRow {
  id: string;
  role?: string | null;
  approval_password_hash: string | null;
  approval_password_failed_count: number | null;
  approval_password_locked_until: string | null;
}

/**
 * Verifies a step-up approval password against users.approval_password_hash,
 * driving the lockout heuristic (failed_count / locked_until).
 *
 * - No hash on file: verification cannot succeed; record the failure so the
 *   lockout counter still advances.
 * - Wrong password: increment approval_password_failed_count; when it reaches
 *   STEPUP_MAX_FAILURES set approval_password_locked_until = now + 15 min and
 *   reset the counter to 0. Always audits PERMISSION_STEPUP_FAILED and fails.
 * - Locked out (locked_until in the future): fail without touching the hash.
 * - Correct: reset failed_count / locked_until, return ok.
 */
export async function checkStepupPassword(
  authUserId: string,
  authUserRole: string,
  password: string | undefined | null,
): Promise<StepupCheckOutcome> {
  const supabase = getSupabaseServiceClient();
  const { data: userRow, error: userErr } = await supabase
    .from("users")
    .select("role, approval_password_hash, approval_password_failed_count, approval_password_locked_until")
    .eq("id", authUserId)
    .maybeSingle();

  if (userErr || !userRow) {
    return { ok: false, code: "INTERNAL_ERROR", message: "Could not load user record for step-up verification." };
  }

  const row = userRow as unknown as UserStepupRow;
  const lockedUntil: string | null = row.approval_password_locked_until ?? null;
  if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Approval password is locked. Try again later.",
      failed: true,
    };
  }

  const supplied = typeof password === "string" ? password : "";
  const targetHash: string | null = row.approval_password_hash ?? null;

  if (!supplied) {
    await applyStepupFailure(supabase, row, authUserRole, "missing_password");
    return { ok: false, code: "FORBIDDEN", message: "Approval password is required for this action.", failed: true };
  }

  const verified = targetHash ? await verifyPassword(supplied, targetHash) : false;
  if (!verified) {
    await applyStepupFailure(supabase, row, authUserRole, "wrong_password");
    return { ok: false, code: "FORBIDDEN", message: "Incorrect approval password.", failed: true };
  }

  // Success: clear the failure state.
  await supabase
    .from("users")
    .update({
      approval_password_failed_count: 0,
      approval_password_locked_until: null,
    })
    .eq("id", authUserId);

  return { ok: true, code: "OK", message: "Verified" };
}

/**
 * Records a step-up failure: increments the counter, locks for 15 minutes when
 * the threshold is hit, and audits PERMISSION_STEPUP_FAILED.
 */
async function applyStepupFailure(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  userRow: UserStepupRow,
  actorRole: string,
  reason: "missing_password" | "wrong_password",
): Promise<void> {
  const current = userRow.approval_password_failed_count ?? 0;
  const next = current + 1;
  const lockNow = next >= STEPUP_MAX_FAILURES;

  await supabase
    .from("users")
    .update({
      approval_password_failed_count: lockNow ? 0 : next,
      ...(lockNow
        ? {
            approval_password_locked_until: new Date(
              Date.now() + STEPUP_LOCKOUT_MINUTES * 60 * 1000,
            ).toISOString(),
          }
        : {}),
    })
    .eq("id", userRow.id);

  addAudit({
    action: "PERMISSION_STEPUP_FAILED",
    userId: userRow.id,
    role: (actorRole || userRow.role) as Role,
    details: { reason, failedCount: next, locked: lockNow },
  }).catch((err) => console.error("[Stepup] addAudit error:", err));
}

/**
 * Validates that the caller is an allowed approver for a forward, that the
 * target role is valid, and that step-up (when required) was verified.
 *
 * Returns a Response-shaped outcome (ok + optional HTTP response) plus the
 * ForwardInput fields needed to call forwardTicket.
 */
export interface ForwardPrepResult {
  ok: boolean;
  response?: Response;
  ticket?: ScopedTicketRow;
  actor?: ActorContext;
  targetRole?: string;
  comment?: string;
  stepupVerified?: boolean;
}

export async function prepareHostelForward(args: {
  ticketParam: string;
  authUserId: string;
  authUserRole: string;
  authUserEmail: string;
  actorName: string;
  body: { targetRole?: unknown; comment?: unknown; stepupPassword?: unknown };
}): Promise<ForwardPrepResult> {
  const { ticketParam, authUserId, authUserRole, authUserEmail, actorName, body } = args;

  if (!APPROVER_FORWARD_ROLES.includes(authUserRole)) {
    return {
      ok: false,
      response: jsonError(403, "FORBIDDEN", "Only hostel approvers may forward a ticket"),
    };
  }

  // Principal (L4) cannot forward — top of the chain. Sysadmin/admin exempt.
  if (authUserRole === "principal" && !SYSADMIN_LIKE.has(authUserRole)) {
    return {
      ok: false,
      response: jsonError(403, "FORBIDDEN", "Principal is the top level and cannot forward"),
    };
  }

  const targetRole = typeof body.targetRole === "string" ? body.targetRole : "";
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if (!targetRole) {
    return { ok: false, response: jsonError(400, "BAD_REQUEST", "targetRole is required") };
  }
  if (!comment) {
    return { ok: false, response: jsonError(400, "BAD_REQUEST", "comment is required") };
  }

  const scope = await getScopedTicket(ticketParam, authUserId, authUserRole);
  if ("notFound" in scope && scope.notFound) {
    return { ok: false, response: jsonError(404, "NOT_FOUND", "Permission request not found") };
  }
  if (!("request" in scope)) {
    return { ok: false, response: jsonError(403, "FORBIDDEN", "Access denied") };
  }
  const ticket = scope.request;

  if (ticket.workflow_type !== "hostel") {
    return { ok: false, response: jsonError(400, "BAD_REQUEST", "Only hostel tickets can be forwarded") };
  }

  const ticketReason =
    typeof (ticket as { reason?: unknown }).reason === "string"
      ? ((ticket as { reason?: unknown }).reason as string)
      : undefined;

  const stepupNeeded = requiresStepup({
    actorRole: authUserRole,
    action: "forward",
    targetRole,
    reason: ticketReason,
  });

  let stepupVerified = false;
  if (stepupNeeded) {
    const check = await checkStepupPassword(
      authUserId,
      authUserRole,
      typeof body.stepupPassword === "string" ? body.stepupPassword : undefined,
    );
    if (!check.ok) {
      return { ok: false, response: jsonError(403, check.code, check.message) };
    }
    stepupVerified = true;
  }

  const actor: ActorContext = { id: authUserId, name: actorName, role: authUserRole };
  return { ok: true, ticket, actor, targetRole, comment, stepupVerified };
}

/**
 * Persists a hostel forward using the pure forwardTicket, audits
 * PERMISSION_FORWARDED_TO_LEVEL and notifies the target-level queue.
 */
export async function applyHostelForward(args: {
  ticket: ScopedTicketRow;
  actor: ActorContext;
  targetRole: string;
  comment: string;
  stepupVerified: boolean;
  authUserRole: string;
  authUserEmail: string;
  authUserId: string;
}): Promise<{ response: Response; updated?: unknown }> {
  const { ticket, actor, targetRole, comment, stepupVerified } = args;
  const supabase = getSupabaseServiceClient();

  const t = ticket as unknown as {
    id: string;
    ticket_number: string;
    workflow_type: string;
    current_stage: string;
    status: string;
    hostel_scope?: string | null;
    student_user_id: string;
    stage_history: StageHistoryEntry[] | null | unknown;
    document_required?: boolean;
    document_url?: string | null;
    biometric_hostel_at?: string | null;
    biometric_gate_at?: string | null;
    digital_signature?: string | null;
    branch?: string | null;
    requester_user_id?: string;
  };

  const snapshot: RequestSnapshot = {
    id: t.id,
    ticket_number: t.ticket_number,
    workflow_type: t.workflow_type as RequestSnapshot["workflow_type"],
    current_stage: t.current_stage,
    status: t.status,
    hostel_scope: t.hostel_scope ?? null,
    student_user_id: t.student_user_id,
    stage_history: (t.stage_history as StageHistoryEntry[] | null) ?? null,
    document_required: t.document_required ?? false,
    document_url: t.document_url ?? null,
    biometric_hostel_at: t.biometric_hostel_at ?? null,
    biometric_gate_at: t.biometric_gate_at ?? null,
    digital_signature: t.digital_signature ?? null,
    branch: t.branch ?? null,
    requester_user_id: t.requester_user_id ?? t.student_user_id,
  };

  let result;
  try {
    result = forwardTicket({ ticket: snapshot, actor, targetRole, comment, stepupVerified });
  } catch (err) {
    const code = err instanceof Error ? (err as { code?: string }).code || "RULE_ERROR" : "RULE_ERROR";
    const message = err instanceof Error ? err.message : "Forward rule violation";
    return { response: jsonError(400, code, message) };
  }

  const nowIso = new Date().toISOString();
  const updates: Record<string, unknown> = {
    current_stage: result.updates.current_stage,
    stage_history: result.updates.stage_history,
    routed_to_role: result.updates.routed_to_role,
    forwarded_from_role: result.updates.forwarded_from_role,
    forward_comment: result.updates.forward_comment,
    updated_at: nowIso,
  };
  if (result.updates.stepup_verified_at) {
    updates.stepup_verified_at = result.updates.stepup_verified_at;
    updates.stepup_verified_by = actor.id;
  }

  const { data: updated, error: updateErr } = await supabase
    .from("permission_requests")
    .update(updates)
    .eq("id", ticket.id)
    .select()
    .single();

  if (updateErr) {
    console.error("[Hostel Forward] update error for ticket", ticket.ticket_number, updateErr.message);
    return {
      response: jsonError(500, "UPDATE_ERROR", updateErr.message),
    };
  }

  addAudit({
    action: "PERMISSION_FORWARDED_TO_LEVEL",
    userId: args.authUserId,
    userName: args.authUserEmail,
    role: args.authUserRole as Role,
    details: {
      ticketNumber: ticket.ticket_number,
      fromRole: args.actor.role,
      toRole: targetRole,
      stepupVerified,
    },
  }).catch((err) => console.error("[Hostel Forward] addAudit error:", err));

  addNotification(
    "user",
    ticket.student_user_id,
    "permission",
    `Permission ${ticket.ticket_number} Forwarded`,
    result.effects.notifyMessage ?? `Ticket ${ticket.ticket_number} forwarded to ${targetRole}.`,
  ).catch((err) => console.error("[Hostel Forward] addNotification error:", err));

  return { response: okJson({ success: true, data: updated }), updated };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESCALATE_UP — student-initiated move to the next hostel level after a rejection
// ─────────────────────────────────────────────────────────────────────────────

export interface EscalateUpPrep {
  ok: boolean;
  response?: Response;
  nextStage?: string;
  ticket?: ScopedTicketRow;
}

/**
 * Student-initiated escalation: moves a REJECTED hostel ticket to the next
 * level via nextHostelLevel. The caller must be the student (or owner).
 * The ticket must have status REJECTED and be a hostel workflow.
 */
export async function prepareEscalateUp(args: {
  ticketParam: string;
  authUserId: string;
  authUserRole: string;
}): Promise<EscalateUpPrep> {
  const { ticketParam, authUserId, authUserRole } = args;

  const scope = await getScopedTicket(ticketParam, authUserId, authUserRole);
  if ("notFound" in scope && scope.notFound) {
    return { ok: false, response: jsonError(404, "NOT_FOUND", "Permission request not found") };
  }
  if (!("request" in scope)) {
    return { ok: false, response: jsonError(403, "FORBIDDEN", "Access denied") };
  }
  const ticket = scope.request;

  if (ticket.workflow_type !== "hostel") {
    return { ok: false, response: jsonError(400, "BAD_REQUEST", "Only hostel tickets can be escalated") };
  }
  if (ticket.status !== "REJECTED") {
    return {
      ok: false,
      response: jsonError(400, "BAD_REQUEST", `Cannot escalate: ticket is ${ticket.status}, expected REJECTED`),
    };
  }
  // Students may only escalate their own tickets.
  if (authUserRole === "student" && ticket.student_user_id !== authUserId) {
    return { ok: false, response: jsonError(403, "FORBIDDEN", "Students may only escalate their own tickets") };
  }

  const nextStage = nextHostelLevel(ticket.current_stage);
  if (!nextStage) {
    return {
      ok: false,
      response: jsonError(400, "BAD_REQUEST", "Already at the top hostel level; cannot escalate further"),
    };
  }

  return { ok: true, nextStage, ticket };
}

/** Persists an ESCALATE_UP move, audits, and notifies the student. */
export async function applyEscalateUp(args: {
  ticket: ScopedTicketRow;
  nextStage: string;
  actor: { id: string; name: string; role: string };
  authUserEmail: string;
  /**
   * Optional escalation reason chosen by the student in the escalation modal
   * (emergency / special_leave / daily_outing / day_pass / home_out /
   * day_scholar_out). Recorded on the audit entry so the reviewer knows why
   * the escalation was requested. The escalation target stage is still
   * computed by the caller (nextHostelLevel), not by the reason.
   */
  reason?: string;
}): Promise<{ response: Response; updated?: unknown }> {
  const { ticket, nextStage, actor, authUserEmail, reason } = args;
  const supabase = getSupabaseServiceClient();

  const updatedHistory: StageHistoryEntry[] = appendStageHistory(
    (ticket.stage_history as StageHistoryEntry[] | null) ?? null,
    actor,
    "ESCALATE_UP",
    reason ?? null,
    { from: ticket.current_stage, to: nextStage },
  );

  const { data: updated, error: updateErr } = await supabase
    .from("permission_requests")
    .update({
      current_stage: nextStage,
      status: "PENDING",
      stage_history: updatedHistory,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticket.id)
    .select()
    .single();

  if (updateErr) {
    return { response: jsonError(500, "UPDATE_ERROR", updateErr.message) };
  }

  addAudit({
    action: "PERMISSION_REQUEST_ESCALATED",
    userId: actor.id,
    userName: authUserEmail,
    role: actor.role as Role,
    details: {
      ticketNumber: ticket.ticket_number,
      action: "ESCALATE_UP",
      fromStage: ticket.current_stage,
      toStage: nextStage,
      ...(reason ? { reason } : {}),
    },
  }).catch((err) => console.error("[Escalate Up] addAudit error:", err));

  addNotification(
    "user",
    ticket.student_user_id,
    "permission",
    `Permission ${ticket.ticket_number} Escalated`,
    `Your request ${ticket.ticket_number} was escalated to ${nextStage} for review.`,
  ).catch((err) => console.error("[Escalate Up] addNotification error:", err));

  return { response: okJson({ success: true, data: updated }), updated };
}

// ─────────────────────────────────────────────────────────────────────────────
// Approval-password validation helpers (used by set / rotate routes)
// ─────────────────────────────────────────────────────────────────────────────

export interface PasswordPolicyError {
  code: string;
  message: string;
}

/** Enforces the shared approval-password policy: min length, differs from login. */
export function validateApprovalPasswordPolicy(
  newPassword: string,
  loginPasswordHash: string | null,
  currentApprovalPasswordHash: string | null = null,
): Promise<PasswordPolicyError | null> {
  return validateApprovalPasswordPolicyAsync(newPassword, loginPasswordHash, currentApprovalPasswordHash);
}

async function validateApprovalPasswordPolicyAsync(
  newPassword: string,
  loginPasswordHash: string | null,
  currentApprovalPasswordHash: string | null,
): Promise<PasswordPolicyError | null> {
  if (newPassword.length < APPROVAL_PASSWORD_MIN_LENGTH) {
    return {
      code: "BAD_REQUEST",
      message: `Approval password must be at least ${APPROVAL_PASSWORD_MIN_LENGTH} characters`,
    };
  }
  if (loginPasswordHash && (await verifyPassword(newPassword, loginPasswordHash))) {
    return { code: "BAD_REQUEST", message: "Approval password must differ from your login password" };
  }
  if (currentApprovalPasswordHash && (await verifyPassword(newPassword, currentApprovalPasswordHash))) {
    return { code: "BAD_REQUEST", message: "New approval password must differ from the current approval password" };
  }
  return null;
}

/** Hashes a new approval password (bcrypt cost 10 via hashPassword). */
export async function hashApprovalPassword(plain: string): Promise<string> {
  return hashPassword(plain);
}

// ─────────────────────────────────────────────────────────────────────────────
// Response helpers (mirror the repo's NextResponse shapes)
// ─────────────────────────────────────────────────────────────────────────────

function jsonError(status: number, code: string, message: string): Response {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function okJson(body: { success: true; data?: unknown; message?: string }): Response {
  return NextResponse.json(body);
}
