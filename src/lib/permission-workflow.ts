import { query } from "@/lib/postgres";
import type { Role, WorkflowType } from "@/lib/types";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { getParentChildren } from "@/lib/db";
export type { WorkflowType };

export const ROLE_STAGE_PERMISSIONS: Record<string, readonly string[]> = {
  caretaker: ["caretaker"],
  deputy_warden: ["deputy_warden"],
  hostel_manager: ["hostel_manager"],
  principal: ["warden_or_principal", "principal"],
  faculty: ["faculty"],
  hod: ["hod"],
  oie: ["oie"],
  vice_principal: [],
  exam_superintendent: ["exam_superintendent"],
  sysadmin: ["*"],
  admin: ["*"],
};


export const WORKFLOW_STAGES: Record<WorkflowType, string[]> = {
  hostel: ["caretaker", "deputy_warden", "hostel_manager", "warden_or_principal", "completed"],
  exam: ["hod", "oie", "vice_principal", "principal", "completed"],
  memo: ["faculty", "hod", "vice_principal", "principal", "completed"],
  staff_leave: ["hod", "vice_principal", "principal", "completed"],
  lab_access: ["lab_incharge", "hod", "completed"],
};

/**
 * Returns the first stage for a new request.
 */
export function resolveInitialStage(workflowType: WorkflowType): string {
  return WORKFLOW_STAGES[workflowType][0];
}

/**
 * Returns the next stage name based on the approval chains.
 */
export function resolveNextStage(workflowType: WorkflowType, currentStage: string): string | null {
  const chain = WORKFLOW_STAGES[workflowType];
  const idx = chain.indexOf(currentStage);
  if (idx === -1 || idx === chain.length - 1) {
    return null; // completed or invalid
  }
  return chain[idx + 1];
}

/**
 * Uses the per-workflow Postgres sequences created in Step 1, formats them as HOST-1001, EXAM-1001, MEMO-1001, STF-1001, LAB-1001.
 */
export async function generateTicketNumber(workflowType: WorkflowType): Promise<string> {
  const map: Record<WorkflowType, { seq: string; prefix: string }> = {
    hostel: { seq: "public.hostel_ticket_seq", prefix: "HOST" },
    exam: { seq: "public.exam_ticket_seq", prefix: "EXAM" },
    memo: { seq: "public.memo_ticket_seq", prefix: "MEMO" },
    staff_leave: { seq: "public.staff_leave_ticket_seq", prefix: "STF" },
    lab_access: { seq: "public.lab_ticket_seq", prefix: "LAB" },
  };
  const { seq, prefix } = map[workflowType];

  const result = await query<{ nextval: string }>(`SELECT nextval('${seq}')`);
  const nextVal = (result.rows && result.rows.length > 0) ? result.rows[0].nextval : null;
  if (!nextVal) {
    throw new Error(`Failed to generate ticket number for ${workflowType}`);
  }

  return `${prefix}-${nextVal}`;
}

/**
 * Validates that a user's role is allowed to act at that stage.
 */
export function canApproveAtStage(role: string, workflowType: WorkflowType, currentStage: string): boolean {
  if (role === "admin" || role === "sysadmin") return true;
  return ROLE_STAGE_PERMISSIONS[role]?.includes(currentStage) ?? false;
}

/**
 * Branch-scoped result of {@link canApproveAtStageWithBranch}.
 */
export interface BranchGateResult {
  allowed: boolean;
  /** Reason the gate failed (empty string when allowed). */
  reason: string;
  /** The stage that must match the actor's branch (empty when not applicable). */
  matchedStage: string;
}

/**
 * Branch-scoped variant of {@link canApproveAtStage}.
 *
 * Pure engine gate: for `staff_leave` at the `hod` stage, the actor must be a
 * HOD whose branch (`actorBranch`) equals the requesting staff member's branch
 * (`requesterBranch`). When the requester's branch is not supplied (null/empty)
 * the check falls back to the plain role/stage gate.
 *
 * Stays in the pure layer (L2) with no DB access — the L4 API handler resolves
 * both branch values and passes them in.
 */
export function canApproveAtStageWithBranchResult(
  role: string,
  workflowType: WorkflowType,
  currentStage: string,
  actorBranch: string | null | undefined,
  requesterBranch: string | null | undefined,
): BranchGateResult {
  if (!canApproveAtStage(role, workflowType, currentStage)) {
    return { allowed: false, reason: `Role ${role} is not authorized at stage ${currentStage}`, matchedStage: currentStage };
  }

  if (
    role === "hod" &&
    workflowType === "staff_leave" &&
    currentStage === "hod" &&
    requesterBranch &&
    actorBranch !== requesterBranch
  ) {
    return { allowed: false, reason: `HOD of branch ${requesterBranch} required to act at the hod stage`, matchedStage: "hod" };
  }

  return { allowed: true, reason: "", matchedStage: "" };
}

export function canApproveAtStageWithBranch(
  role: string,
  workflowType: WorkflowType,
  currentStage: string,
  actorBranch: string | null | undefined,
  requesterBranch: string | null | undefined,
): boolean {
  return canApproveAtStageWithBranchResult(role, workflowType, currentStage, actorBranch, requesterBranch).allowed;
}

export interface StageHistoryEntry {
  stage?: string;
  actor_id?: string;
  actor?: string | { id: string; name?: string; role?: string };
  action: string;
  comment?: string | null;
  timestamp: string;
  transition?: { from?: string; to?: string };
}

/**
 * Returns a new history array with the appended entry (does not mutate input).
 */
export function appendStageHistory(
  existing: StageHistoryEntry[] | unknown,
  actor: string | { id: string; name?: string; role?: string },
  action: string,
  comment?: string | null,
  transition?: { from?: string; to?: string }
): StageHistoryEntry[] {
  const rawArray = (Array.isArray(existing) ? existing : []) as StageHistoryEntry[];
  const currentStage =
    transition?.to ??
    transition?.from ??
    (rawArray.length > 0 ? (rawArray[rawArray.length - 1].stage ?? "initial") : "initial");
  const actorId = typeof actor === "string" ? actor : actor.id;
  const newEntry: StageHistoryEntry = {
    stage: currentStage,
    actor_id: actorId,
    actor: typeof actor === "object" ? actor : undefined,
    action,
    comment: comment ?? undefined,
    timestamp: new Date().toISOString(),
    ...(transition ? { transition } : {}),
  };
  return [...rawArray, newEntry];
}

// ──────────────────────────────────────────────────────────────────────
// Pure decision engine — no DB, no HTTP, no side effects.

export type PermissionAction =
  | "APPROVE"
  | "FORWARD"
  | "REJECT"
  | "ESCALATE"
  | "REQUEST_INFO"
  | "COMPLETE"
  | "SIGN"
  | "BIOMETRIC_HOSTEL"
  | "BIOMETRIC_GATE"
  | "CANCEL";

export interface RequestSnapshot {
  id: string;
  ticket_number: string;
  workflow_type: WorkflowType;
  current_stage: string;
  status: string;
  hostel_scope?: string | null;
  student_user_id: string;
  stage_history: StageHistoryEntry[] | null;
  document_required?: boolean;
  document_url?: string | null;
  biometric_hostel_at?: string | null;
  biometric_gate_at?: string | null;
  digital_signature?: string | null;
  branch?: string | null;
  requester_user_id?: string;
}

export interface ActorContext {
  id: string;
  name: string;
  role: string;
}

export interface DecisionInput {
  action: PermissionAction;
  comment?: string;
  targetStage?: string;
  evidencePayload?: {
    signatureHash?: string;
    deviceDisabled?: boolean;
  };
}

export interface DecisionResult {
  updates: Partial<
    Pick<
      RequestSnapshot,
      | "current_stage"
      | "status"
      | "stage_history"
      | "biometric_hostel_at"
      | "biometric_gate_at"
      | "digital_signature"
    >
  >;
  effects: {
    auditAction: string;
    notifyUserId?: string;
    notifyMessage?: string;
    signPayload?: { signatureHash: string };
  };
}

export class PermissionRuleError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function applyPermissionAction(
  req: RequestSnapshot,
  actor: ActorContext,
  input: DecisionInput,
  now: string = new Date().toISOString(),
): DecisionResult {
  // 1. Terminal states cannot be modified
  if (req.status === "REJECTED" || req.status === "COMPLETED" || req.status === "CANCELLED") {
    throw new PermissionRuleError(
      "TERMINAL_STATE",
      `Cannot act on a request with status ${req.status}`,
    );
  }

  // 2. Authorization gate (RBAC + stage)
  if (!canApproveAtStage(actor.role, req.workflow_type, req.current_stage)) {
    throw new PermissionRuleError(
      "FORBIDDEN_STAGE",
      `Role ${actor.role} is not authorized at stage ${req.current_stage}`,
    );
  }

  const push = (
    hist: StageHistoryEntry[] | null,
    action: string,
    to?: string,
  ) =>
    appendStageHistory(
      hist ?? [],
      { id: actor.id, name: actor.name, role: actor.role },
      action,
      input.comment ?? null,
      { from: req.current_stage, to },
    );

  const normalizedAction = input.action.toUpperCase() as PermissionAction;

  switch (normalizedAction) {
    // ── Forward-moving decisions ─────────────────────────────────────
    case "APPROVE":
    case "FORWARD": {
      const next =
        input.targetStage ??
        resolveNextStage(req.workflow_type, req.current_stage);

      if (!next || next === "completed") {
        return {
          updates: {
            current_stage: "completed",
            status: "APPROVED",
            stage_history: push(req.stage_history, "APPROVED", "completed"),
          },
          effects: {
            auditAction: "PERMISSION_APPROVED",
            notifyUserId: req.student_user_id,
            notifyMessage: `Ticket ${req.ticket_number} fully approved.`,
          },
        };
      }

      return {
        updates: {
          current_stage: next,
          status: "PENDING",
          stage_history: push(req.stage_history, "APPROVED", next),
        },
        effects: { auditAction: "PERMISSION_APPROVED" },
      };
    }

    // ── Rejection ────────────────────────────────────────────────────
    case "REJECT":
      return {
        updates: {
          status: "REJECTED",
          stage_history: push(req.stage_history, "REJECTED"),
        },
        effects: {
          auditAction: "PERMISSION_REJECTED",
          notifyUserId: req.student_user_id,
          notifyMessage: `Ticket ${req.ticket_number} rejected.`,
        },
      };

    // ── Cancel (requester or admin) ──────────────────────────────────
    case "CANCEL":
      return {
        updates: {
          current_stage: "cancelled",
          status: "CANCELLED",
          stage_history: push(req.stage_history, "CANCELLED"),
        },
        effects: {
          auditAction: "PERMISSION_REQUEST_CANCELLED",
          notifyUserId: req.student_user_id,
          notifyMessage: `Ticket ${req.ticket_number} cancelled.`,
        },
      };

    // ── Escalate (skip forward one stage) ────────────────────────────
    case "ESCALATE": {
      const next =
        input.targetStage ??
        resolveNextStage(req.workflow_type, req.current_stage);
      return {
        updates: {
          current_stage: next ?? req.current_stage,
          status: "ESCALATED",
          stage_history: push(req.stage_history, "ESCALATED", next ?? undefined),
        },
        effects: { auditAction: "PERMISSION_ESCALATED" },
      };
    }

    // ── Request info (loop back to student, stay at stage) ───────────
    case "REQUEST_INFO":
      return {
        updates: {
          status: "PENDING",
          stage_history: push(req.stage_history, "REQUEST_INFO"),
        },
        effects: {
          auditAction: "PERMISSION_INFO_REQUESTED",
          notifyUserId: req.student_user_id,
          notifyMessage: input.comment ?? "More information required.",
        },
      };

    // ── Complete (admin/principal force-close) ───────────────────────
    case "COMPLETE":
      return {
        updates: {
          current_stage: "completed",
          status: "COMPLETED",
          stage_history: push(req.stage_history, "COMPLETED", "completed"),
        },
        effects: { auditAction: "PERMISSION_COMPLETED" },
      };

    // ── Digital signature (I5 + I6) ──────────────────────────────────
    case "SIGN": {
      // I5: cannot sign before document exists
      if (!req.document_url) {
        throw new PermissionRuleError(
          "DOCUMENT_MISSING",
          "A document must be uploaded before signing",
        );
      }
      const hash = input.evidencePayload?.signatureHash;
      if (!hash) {
        throw new PermissionRuleError(
          "SIGNATURE_HASH_MISSING",
          "Server-side signature hash was not computed",
        );
      }
      return {
        updates: {
          digital_signature: hash,
          stage_history: push(req.stage_history, "SIGNED"),
        },
        effects: {
          auditAction: "PERMISSION_SIGNED",
          signPayload: { signatureHash: hash },
          notifyUserId: req.student_user_id,
          notifyMessage: `Ticket ${req.ticket_number} digitally signed.`,
        },
      };
    }

    // ── Biometric evidence at hostel stage ───────────────────────────
    case "BIOMETRIC_HOSTEL": {
      if (req.biometric_hostel_at) {
        throw new PermissionRuleError(
          "ALREADY_VERIFIED",
          "Hostel biometric already recorded",
        );
      }
      return {
        updates: {
          biometric_hostel_at: now,
          stage_history: push(
            req.stage_history,
            input.evidencePayload?.deviceDisabled
              ? "BIOMETRIC_HOSTEL_AUTO_PASS"
              : "BIOMETRIC_HOSTEL_VERIFIED",
          ),
        },
        effects: { auditAction: "PERMISSION_BIOMETRIC_HOSTEL" },
      };
    }

    // ── Biometric evidence at gate (final) ───────────────────────────
    case "BIOMETRIC_GATE": {
      if (!req.biometric_hostel_at) {
        throw new PermissionRuleError(
          "HOSTEL_BIOMETRIC_MISSING",
          "Hostel biometric must be recorded before gate biometric",
        );
      }
      return {
        updates: {
          biometric_gate_at: now,
          current_stage: "completed",
          status: "COMPLETED",
          stage_history: push(
            req.stage_history,
            "BIOMETRIC_GATE_VERIFIED",
            "completed",
          ),
        },
        effects: {
          auditAction: "PERMISSION_BIOMETRIC_GATE",
          notifyUserId: req.student_user_id,
          notifyMessage: `Ticket ${req.ticket_number} complete.`,
        },
      };
    }

    default:
      throw new PermissionRuleError(
        "UNKNOWN_ACTION",
        `Unsupported action: ${input.action}`,
      );
  }
}

export interface ScopedTicketRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  student_user_id: string;
  current_stage: string;
  status: string;
  stage_history: unknown[] | null;
  document_required: boolean;
  document_url?: string | null;
  digital_signature?: string | null;
  branch?: string | null;
  requester_user_id?: string;
  [key: string]: unknown;
}

/**
 * Fetches a permission request by its ticket param (ticket number or UUID) and
 * applies the same role-based visibility rules used by `GET /api/permissions/[ticket]`
 * (student → own tickets only; parent/guardian → their children only; approvers,
 * admin/sysadmin → allowed). Extracted in Step 7 so the upload / document / sign
 * routes reuse the identical scoping instead of duplicating it.
 *
 * Returns `null` when the ticket does not exist, and `{ forbidden: true }` when
 * the caller may not see it (caller must map to 404 / 403 respectively).
 */
export async function getScopedTicket(
  ticketParam: string,
  authUserId: string,
  authUserRole: string
): Promise<
  | { notFound: true; forbidden?: never }
  | { forbidden: true; notFound?: never }
  | { request: ScopedTicketRow }
> {
  if (!ticketParam) return { notFound: true };

  const supabase = getSupabaseServiceClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketParam);

  let q = supabase
    .from("permissions")
    .select(
      `
      *,
      student:requester_user_id (
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

  if (error || !request) return { notFound: true };

  if (authUserRole === "student" && request.student_user_id !== authUserId) {
    return { forbidden: true };
  }

  if (authUserRole === "parent" || authUserRole === "guardian") {
    const children = await getParentChildren(authUserId);
    const isChild = (children || []).some((c: { id?: string }) => c.id === request.student_user_id);
    if (!isChild) return { forbidden: true };
  }

  // Hostel scope rules: caretaker/deputy_warden/hostel_manager may only see
  // tickets matching their own hostel_scope (when the ticket has one set).
  if (
    ["caretaker", "deputy_warden", "hostel_manager"].includes(authUserRole)
  ) {
    const { data: userData } = await supabase
      .from("users")
      .select("hostel_scope")
      .eq("id", authUserId)
      .single();
    const actorScope = userData?.hostel_scope as string | null;
    if (actorScope && request.hostel_scope && request.hostel_scope !== actorScope) {
      return { forbidden: true };
    }
  }

  return { request: request as unknown as ScopedTicketRow };
}

// ──────────────────────────────────────────────────────────────────────
// Hostel-permission hierarchy — pure decision engine (additive).
// Order (low → high): caretaker < deputy_warden < hostel_manager < principal.
// These strings mirror ROLES in roles.ts; we keep them literal here so the
// pure layer stays self-contained and DB/HTTP-free.

export const L1_ROLE = "caretaker";
export const L2_ROLE = "deputy_warden";
export const L3_ROLE = "hostel_manager";
export const L4_ROLE = "principal";

export const DAILY_OUTING_MAX_HOURS = 1;
export const DAY_PASS_MAX_HOURS = 12;
export const HOME_OUT_MAX_HOURS: number | null = null; // unlimited
export const STEPUP_REQUIRED_AT_LEVEL = 3;
export const BULK_THRESHOLD = 5;

/** Ordered hostel approval chain, lowest tier first. */
export const HOSTEL_CHAIN: readonly string[] = [L1_ROLE, L2_ROLE, L3_ROLE, L4_ROLE];

/**
 * Returns the first stage for a new hostel request.
 */
export function resolveInitialHostelStage(): string {
  return L1_ROLE;
}

/**
 * Returns the next hostel level above `current`, or `null` when already at the
 * top of the chain (L4 -> null). Unknown roles return null.
 */
export function nextHostelLevel(current: string): string | null {
  const idx = HOSTEL_CHAIN.indexOf(current);
  if (idx === -1) return null;
  if (idx === HOSTEL_CHAIN.length - 1) return null; // already at L4
  return HOSTEL_CHAIN[idx + 1] as string;
}

/**
 * Returns all hostel levels strictly above `current`, in chain order.
 * For L4 (principal) this is []. Unknown roles return the full chain.
 */
export function levelsAbove(current: string): string[] {
  const idx = HOSTEL_CHAIN.indexOf(current);
  const base = idx === -1 ? 0 : idx + 1;
  return HOSTEL_CHAIN.slice(base) as string[];
}

/**
 * Reason-code -> minimum hostel role required to resolve it.
 * (L1 routes can be opened at caretaker; L3 reasons require hostel_manager.)
 */
export const REASON_LEVEL_MAP = {
  daily_outing: L1_ROLE,
  home_out: L1_ROLE,
  day_pass: L1_ROLE,
  emergency: L3_ROLE,
  special_leave: L3_ROLE,
} as const;

/**
 * Pure step-up predicate. Returns true when ANY of the listed conditions hold:
 *  - forward to the top level (L4 / principal)
 *  - direct-generate from L3 or L4
 *  - override a rejection
 *  - reason is emergency or special_leave
 *  - the student has >= 3 prior violations
 *  - the actor has already performed >= BULK_THRESHOLD (5) bulk approvals today
 */
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

/** Typed update fields produced by a hostel forward (superset of the routing fields). */
export interface HostelForwardUpdates {
  current_stage: string;
  stage_history: StageHistoryEntry[];
  routed_to_role: string;
  forwarded_from_role: string;
  forward_comment: string;
  /** ISO timestamp recorded when the actor verified the step-up password. */
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

/**
 * Pure forward of a hostel ticket to a target role.
 * Throws {@link PermissionRuleError} when:
 *  - targetRole is not strictly above the actor's role (and the actor is not sysadmin)
 *  - the comment is empty / whitespace-only
 *  - step-up is required for this forward but not verified
 */
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

export interface DirectGenInput {
  actor: ActorContext;
  studentUserId: string;
  reason: "home_out" | "day_pass" | "emergency" | "special_leave";
  from: string;
  to: string | null;
  note?: string;
  stepupVerified: boolean;
}

/** Updates payload for a direct-generate action (DecisionResult-shaped + extra fields). */
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

/**
 * Pure direct-generate of a permission pass (bypasses the staged chain).
 * Throws {@link PermissionRuleError} when:
 *  - the actor is L1 (caretaker) — caretakers cannot direct-generate
 *  - step-up is required for this direct-generate but not verified
 */
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
