import { query } from "@/lib/postgres";
import type { Role, WorkflowType } from "@/lib/types";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { getParentChildren } from "@/lib/db";
export type { WorkflowType };

export const ROLE_STAGE_PERMISSIONS: Record<string, readonly string[]> = {
  caretaker: ["caretaker", "hostel_biometric"],
  deputy_warden: ["deputy_warden", "hostel_biometric"],
  hostel_manager: ["hostel_manager", "hostel_biometric"],
  warden: ["warden_or_principal", "hostel_biometric"],
  principal: ["warden_or_principal", "principal", "hostel_biometric"],
  operator: ["main_gate"],
  faculty: ["faculty"],
  hod: ["hod"],
  oie: ["oie"],
  vice_principal: ["vice_principal"],
  sysadmin: ["*"],
  admin: ["*"],
};


export const WORKFLOW_STAGES: Record<WorkflowType, string[]> = {
  hostel: ["caretaker", "deputy_warden", "hostel_manager", "warden_or_principal", "hostel_biometric", "main_gate", "completed"],
  exam: ["faculty", "hod", "oie", "vice_principal", "principal", "completed"],
  memo: ["faculty", "hod", "oie", "vice_principal", "principal", "completed"],
  staff_leave: ["hod", "vice_principal", "principal", "completed"],
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
 * Uses the per-workflow Postgres sequences created in Step 1, formats them as HST-1001, EXM-1001, MEM-1001, STF-1001.
 */
export async function generateTicketNumber(workflowType: WorkflowType): Promise<string> {
  const map: Record<WorkflowType, { seq: string; prefix: string }> = {
    hostel: { seq: "public.hostel_ticket_seq", prefix: "HST" },
    exam: { seq: "public.exam_ticket_seq", prefix: "EXM" },
    memo: { seq: "public.memo_ticket_seq", prefix: "MEM" },
    staff_leave: { seq: "public.staff_leave_ticket_seq", prefix: "STF" },
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

  if (currentStage === "hostel_biometric") {
    return ["caretaker", "deputy_warden", "hostel_manager", "warden", "principal"].includes(role);
  }

  const roleMap: Record<string, string> = {
    caretaker: "caretaker",
    deputy_warden: "deputy_warden",
    hostel_manager: "hostel_manager",
    warden: "warden_or_principal",
    principal: "warden_or_principal",
    operator: "main_gate",
    faculty: "faculty",
    hod: "hod",
    oie: "oie",
    vice_principal: "vice_principal",
  };

  if (role === "principal") {
    // Principal overrides other roles in certain chains but follows warden_or_principal
    if (currentStage === "principal" || currentStage === "warden_or_principal") return true;
  }

  return roleMap[role] === currentStage;
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
export function canApproveAtStageWithBranch(
  role: string,
  workflowType: WorkflowType,
  currentStage: string,
  actorBranch: string | null | undefined,
  requesterBranch: string | null | undefined,
): boolean {
  if (!canApproveAtStage(role, workflowType, currentStage)) return false;

  if (
    role === "hod" &&
    workflowType === "staff_leave" &&
    currentStage === "hod" &&
    requesterBranch &&
    actorBranch !== requesterBranch
  ) {
    return false;
  }

  return true;
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
  | "BIOMETRIC_GATE";

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
  if (req.status === "REJECTED" || req.status === "COMPLETED") {
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

      // I4: hostel cannot reach main_gate / COMPLETED without hostel biometric
      if (
        req.workflow_type === "hostel" &&
        (next === "main_gate" || next === "completed") &&
        !req.biometric_hostel_at
      ) {
        // Hold at main_gate — do not advance. Caller will still record audit.
        return {
          updates: {
            current_stage: "main_gate",
            status: "PENDING",
            stage_history: push(
              req.stage_history,
              "AWAITING_HOSTEL_BIOMETRIC",
              "main_gate",
            ),
          },
          effects: {
            auditAction: "PERMISSION_HELD_FOR_BIOMETRIC",
            notifyUserId: req.student_user_id,
            notifyMessage: `Ticket ${req.ticket_number} approved; awaiting hostel biometric check.`,
          },
        };
      }

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
      if (req.current_stage !== "main_gate") {
        throw new PermissionRuleError(
          "WRONG_STAGE",
          `Gate biometric only allowed at main_gate (current: ${req.current_stage})`,
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

  if (error || !request) return { notFound: true };

  if (authUserRole === "student" && request.student_user_id !== authUserId) {
    return { forbidden: true };
  }

  if (authUserRole === "parent" || authUserRole === "guardian") {
    const children = await getParentChildren(authUserId);
    const isChild = (children || []).some((c: { id?: string }) => c.id === request.student_user_id);
    if (!isChild) return { forbidden: true };
  }

  return { request: request as unknown as ScopedTicketRow };
}

