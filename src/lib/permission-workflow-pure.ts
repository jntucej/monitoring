/**
 * Client-safe, pure decision engine for the hostel-permission hierarchy.
 *
 * Lives in its own module so it can be imported from "use client" components
 * (approver UI, gate operator UI) without dragging the Node `pg` driver into
 * the browser bundle. The pre-existing `permission-workflow.ts` re-exports
 * everything in this file so server-side callers keep their import path.
 *
 * Order (low → high): caretaker < deputy_warden < hostel_manager < principal.
 *
 * This module is fully self-contained (no import edge back to
 * permission-workflow.ts, no server-only dependencies) so Turbopack never
 * reaches the `pg` driver through the client component graph. The shared
 * primitives it needs (PermissionRuleError, appendStageHistory, and the
 * interfaces) are declared here and re-exported; permission-workflow.ts
 * re-exports this module one-way, so there is no circular import.
 */
import type { StageHistoryEntry, RequestSnapshot, ActorContext } from "@/lib/permission-workflow-core";
import { appendStageHistory, PermissionRuleError } from "@/lib/permission-workflow-core";

// ── Role constants ──────────────────────────────────────────────────────
export const L1_ROLE = "caretaker";
export const L2_ROLE = "deputy_warden";
export const L3_ROLE = "hostel_manager";
export const L4_ROLE = "principal";

export const DAILY_OUTING_MAX_HOURS = 1;
export const DAY_PASS_MAX_HOURS = 12;
export const HOME_OUT_MAX_HOURS: number | null = null; // unlimited
export const STEPUP_REQUIRED_AT_LEVEL = 3;
export const BULK_THRESHOLD = 5;

// ── Chain resolvers ───────────────────────────────────────────────────────
/** Ordered hostel approval chain, lowest tier first. */
export const HOSTEL_CHAIN: readonly string[] = [L1_ROLE, L2_ROLE, L3_ROLE, L4_ROLE];

export function resolveInitialHostelStage(): string {
  return L1_ROLE;
}

/** Returns the next hostel level above `current`, or null at the top. */
export function nextHostelLevel(current: string): string | null {
  const idx = HOSTEL_CHAIN.indexOf(current);
  if (idx === -1) return null;
  if (idx === HOSTEL_CHAIN.length - 1) return null;
  return HOSTEL_CHAIN[idx + 1] as string;
}

/** Returns all hostel levels strictly above `current`, in chain order. */
export function levelsAbove(current: string): string[] {
  const idx = HOSTEL_CHAIN.indexOf(current);
  const base = idx === -1 ? 0 : idx + 1;
  return HOSTEL_CHAIN.slice(base) as string[];
}

// ── Reason → minimum-level map ──────────────────────────────────────────
export const REASON_LEVEL_MAP = {
  daily_outing: L1_ROLE,
  home_out: L1_ROLE,
  day_pass: L1_ROLE,
  emergency: L3_ROLE,
  special_leave: L3_ROLE,
} as const;

// ── Step-up predicate ───────────────────────────────────────────────────
export function requiresStepup(args: {
  actorRole: string;
  action: "forward" | "direct_generate" | "override_rejection" | "approve";
  reason?: string;
  targetRole?: string;
  studentPriorViolations?: number;
  dailyBulkCount?: number;
}): boolean {
  const {
    actorRole,
    action,
    reason,
    targetRole,
    studentPriorViolations = 0,
    dailyBulkCount = 0,
  } = args;

  if (action === "forward" && targetRole === L4_ROLE) return true;
  if (action === "direct_generate" && (actorRole === L3_ROLE || actorRole === L4_ROLE)) return true;
  if (action === "override_rejection") return true;
  if (reason === "emergency" || reason === "special_leave") return true;
  if (studentPriorViolations >= 3) return true;
  if (dailyBulkCount >= BULK_THRESHOLD) return true;
  return false;
}

// ── Pure forward ────────────────────────────────────────────────────────
export interface HostelForwardUpdates {
  current_stage: string;
  stage_history: StageHistoryEntry[];
  routed_to_role: string;
  forwarded_from_role: string;
  forward_comment: string;
  stepup_verified_at?: string;
}

export interface ForwardInput {
  ticket: RequestSnapshot;
  actor: ActorContext;
  targetRole: string;
  comment: string;
  stepupVerified: boolean;
}

export interface ForwardTicketResult {
  updates: HostelForwardUpdates;
  effects: {
    auditAction: string;
    notifyUserId?: string;
    notifyMessage?: string;
  };
}

export function forwardTicket(input: ForwardInput): ForwardTicketResult {
  const { ticket, actor, targetRole, comment, stepupVerified } = input;

  const isSysadmin = actor.role === "sysadmin";
  const allowedTargets = isSysadmin
    ? [L1_ROLE, L2_ROLE, L3_ROLE, L4_ROLE]
    : levelsAbove(actor.role);

  if (!allowedTargets.includes(targetRole)) {
    throw new PermissionRuleError(
      "FORWARD_TARGET_INVALID",
      `Role ${actor.role} cannot forward to ${targetRole} (not a strictly-higher hostel level and actor is not sysadmin)`,
    );
  }

  if (!comment || comment.trim().length === 0) {
    throw new PermissionRuleError(
      "FORWARD_COMMENT_REQUIRED",
      "A forward comment is required",
    );
  }

  const stepupNeeded = requiresStepup({
    actorRole: actor.role,
    action: "forward",
    targetRole,
  });
  if (stepupNeeded && !stepupVerified) {
    throw new PermissionRuleError(
      "STEPUP_REQUIRED",
      "Step-up password verification is required for this forward",
    );
  }

  const now = new Date().toISOString();
  const stageHistory = appendStageHistory(
    ticket.stage_history,
    { id: actor.id, name: actor.name, role: actor.role },
    "FORWARDED",
    comment,
    { from: ticket.current_stage, to: targetRole },
  );

  const updates: HostelForwardUpdates = {
    current_stage: targetRole,
    stage_history: stageHistory,
    routed_to_role: targetRole,
    forwarded_from_role: actor.role,
    forward_comment: comment,
    ...(stepupVerified ? { stepup_verified_at: now } : {}),
  };

  return {
    updates,
    effects: {
      auditAction: "PERMISSION_HOSTEL_FORWARDED",
      notifyUserId: ticket.student_user_id,
      notifyMessage: `Ticket ${ticket.ticket_number} forwarded to ${targetRole} by ${actor.role}.`,
    },
  };
}

// ── Pure direct-generate ────────────────────────────────────────────────
export interface DirectGenInput {
  actor: ActorContext;
  studentUserId: string;
  reason: "home_out" | "day_pass" | "emergency" | "special_leave";
  from: string;
  to: string | null;
  note?: string;
  stepupVerified: boolean;
}

export interface DirectGenUpdates {
  status: "APPROVED";
  current_stage: "completed";
  direct_generated: true;
  reason?: string;
  from?: string;
  to?: string | null;
  note?: string;
  stepup_verified_at?: string;
  stage_history: StageHistoryEntry[];
}

export interface DirectGenResult {
  updates: DirectGenUpdates;
  effects: {
    auditAction: string;
    notifyUserId?: string;
    notifyMessage?: string;
  };
}

export function directGeneratePass(input: DirectGenInput): DirectGenResult {
  const { actor, studentUserId, reason, from, to, note, stepupVerified } = input;

  if (actor.role === L1_ROLE) {
    throw new PermissionRuleError(
      "DIRECT_GEN_FORBIDDEN",
      "Caretaker (L1) cannot direct-generate a pass",
    );
  }

  const stepupNeeded = requiresStepup({
    actorRole: actor.role,
    action: "direct_generate",
    reason,
  });
  if (stepupNeeded && !stepupVerified) {
    throw new PermissionRuleError(
      "STEPUP_REQUIRED",
      "Step-up password verification is required for this direct-generate",
    );
  }

  const now = new Date().toISOString();
  const stageHistory = appendStageHistory(
    null,
    { id: actor.id, name: actor.name, role: actor.role },
    "DIRECT_GENERATED",
    note ?? null,
    { from: "completed", to: "completed" },
  );

  const updates: DirectGenUpdates = {
    status: "APPROVED",
    current_stage: "completed",
    direct_generated: true,
    reason,
    from,
    to,
    ...(note ? { note } : {}),
    ...(stepupVerified ? { stepup_verified_at: now } : {}),
    stage_history: stageHistory,
  };

  return {
    updates,
    effects: {
      auditAction: "PERMISSION_DIRECT_GENERATED",
      notifyUserId: studentUserId,
      notifyMessage: `Direct pass generated (${reason}) by ${actor.role}.`,
    },
  };
}
