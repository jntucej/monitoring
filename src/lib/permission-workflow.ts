import type { Role, WorkflowType } from "@/lib/types";
import type {
  StageHistoryEntry,
  RequestSnapshot,
  ActorContext,
} from "@/lib/permission-workflow-core";
import {
  appendStageHistory,
  PermissionRuleError,
} from "@/lib/permission-workflow-core";

export type { WorkflowType, StageHistoryEntry, RequestSnapshot, ActorContext };
export { appendStageHistory, PermissionRuleError };
export {
  L1_ROLE,
  L2_ROLE,
  L3_ROLE,
  L4_ROLE,
  resolveInitialHostelStage,
  nextHostelLevel,
  levelsAbove,
  forwardTicket,
  directGeneratePass,
  resolveEntryOptions,
} from "@/lib/permission-workflow-pure";

export const ROLE_STAGE_PERMISSIONS: Record<string, readonly string[]> = {
  caretaker: ["caretaker"],
  deputy_warden: ["deputy_warden"],
  hostel_manager: ["hostel_manager"],
  warden: ["hostel_manager", "warden_or_principal", "principal"],
  principal: ["warden_or_principal", "principal"],
  faculty: ["faculty"],
  hod: ["hod"],
  oie: ["oie"],
  vice_principal: ["vice_principal"],
  principal_or_vp: ["principal", "vice_principal"],
  exam_superintendent: ["exam_superintendent"],
  sysadmin: ["*"],
  admin: ["*"],
};

export const WORKFLOW_STAGES: Record<WorkflowType, readonly string[]> = {
  hostel:      ["caretaker", "deputy_warden", "hostel_manager", "warden_or_principal", "principal"],
  exam:        ["hod", "oie", "exam_branch", "vice_principal", "principal"],
  memo:        ["hod", "principal"],
  staff_leave: ["hod", "principal"],
  lab_access:  ["faculty", "hod", "principal"],
} as const;

export const REASON_LEVEL_MAP = {
  daily_outing: "caretaker",
  home_out: "caretaker",
  day_pass: "caretaker",
  special_leave: "caretaker",
  emergency: "caretaker",
  day_scholar_out: "caretaker",
};

function normalizeRole(role: string): string {
  return role === "warden" ? "hostel_manager" : role;
}

export function resolveInitialStage(workflowType: WorkflowType): string {
  const chain = WORKFLOW_STAGES[workflowType];
  if (!chain || chain.length === 0) {
    throw new PermissionRuleError(
      "UNKNOWN_WORKFLOW",
      `Unknown workflow type: ${workflowType}`,
    );
  }
  return chain[0];
}

export function resolveInitialStageForRequester(
  workflowType: WorkflowType,
  requesterRole: Role | string,
): string {
  const role = normalizeRole(String(requesterRole));
  if (workflowType === "lab_access") {
    return role === "student" ? "faculty" : "hod";
  }
  if (workflowType === "memo") {
    return ["admin", "sysadmin", "principal", "vice_principal"].includes(role)
      ? "principal"
      : "hod";
  }
  return resolveInitialStage(workflowType);
}

export function resolveNextStage(
  workflowType: WorkflowType,
  currentStage: string,
): string | null {
  const chain = WORKFLOW_STAGES[workflowType];
  if (!chain) return null;
  const normalizedCurrent = currentStage === "warden" ? "hostel_manager" : currentStage;
  const idx = chain.indexOf(normalizedCurrent);
  if (idx === -1) return null;
  if (idx === chain.length - 1) return null;
  return chain[idx + 1];
}

export function canApproveAtStage(
  role: string,
  workflowType: WorkflowType,
  currentStage: string,
): boolean {
  const chain = WORKFLOW_STAGES[workflowType];
  if (!chain) return false;
  const stage = currentStage === "warden" ? "hostel_manager" : currentStage;
  const normalizedRole = normalizeRole(role);
  return chain.includes(stage) && (normalizedRole === stage || normalizedRole === "admin" || normalizedRole === "sysadmin");
}

export interface BranchGateResult {
  allowed: boolean;
  reason: string;
  matchedStage: string;
}

export function canApproveAtStageWithBranchResult(
  role: string,
  workflowType: WorkflowType,
  currentStage: string,
  actorBranch: string | null | undefined,
  requesterBranch: string | null | undefined,
): BranchGateResult {
  const stageAllowed = canApproveAtStage(role, workflowType, currentStage);
  if (!stageAllowed) {
    return { allowed: false, reason: "STAGE_NOT_AUTHORIZED", matchedStage: currentStage };
  }
  if (workflowType === "staff_leave") {
    const a = (actorBranch ?? "").trim();
    const r = (requesterBranch ?? "").trim();
    if (a && r && a !== r) {
      return { allowed: false, reason: "BRANCH_MISMATCH", matchedStage: currentStage };
    }
  }
  return { allowed: true, reason: "OK", matchedStage: currentStage };
}

export function canApproveAtStageWithBranch(
  role: string,
  workflowType: WorkflowType,
  currentStage: string,
  actorBranch: string | null | undefined,
  requesterBranch: string | null | undefined,
): boolean {
  return canApproveAtStageWithBranchResult(
    role, workflowType, currentStage, actorBranch, requesterBranch,
  ).allowed;
}

const SEQ_MAP: Record<WorkflowType, { seq: string; prefix: string }> = {
  hostel:      { seq: "hostel_ticket_seq",      prefix: "HP" },
  exam:        { seq: "exam_ticket_seq",        prefix: "EXAM" },
  memo:        { seq: "memo_ticket_seq",        prefix: "MEMO" },
  staff_leave: { seq: "staff_leave_ticket_seq", prefix: "LEAVE" },
  lab_access:  { seq: "lab_ticket_seq",         prefix: "LAB" },
};

export async function generateTicketNumber(workflowType: WorkflowType): Promise<string> {
  const meta = SEQ_MAP[workflowType];
  if (!meta) {
    throw new PermissionRuleError(
      "UNKNOWN_WORKFLOW",
      `Unknown workflow type: ${workflowType}`,
    );
  }
  const { query } = await import("@/lib/postgres");
  const { rows } = await query<{ n: string }>(`SELECT nextval('${meta.seq}')::text AS n`);
  const year = new Date().getUTCFullYear();
  return `${meta.prefix}-${year}-${String(rows[0].n).padStart(4, "0")}`;
}

export type DirectGenReason =
  | "home_out"
  | "day_pass"
  | "emergency"
  | "special_leave";

export const DAILY_OUTING_MAX_HOURS = 4;
export const DAY_PASS_MAX_HOURS    = 12;
export const HOME_OUT_MAX_HOURS    = 48;

export function maxDurationForReason(reason: DirectGenReason | string): number | null {
  switch (reason) {
    case "daily_outing":  return DAILY_OUTING_MAX_HOURS;
    case "day_pass":      return DAY_PASS_MAX_HOURS;
    case "home_out":      return HOME_OUT_MAX_HOURS;
    case "emergency":
    case "special_leave": return null;
    default:              return null;
  }
}

export interface StepupInput {
  actorRole: string;
  action: "forward" | "direct_generate" | "override_rejection" | "approve";
  reason?: string;
  targetRole?: string;
  studentPriorViolations?: number;
  dailyBulkCount?: number;
}

export const BULK_THRESHOLD = 5;

export function requiresStepup(input: StepupInput): boolean {
  const role = normalizeRole(input.actorRole);
  if (input.action === "forward") {
    return (
      role === "hostel_manager" &&
      input.targetRole === "principal" &&
      (input.reason === "home_out" || input.reason === "special_leave")
    );
  }
  if (input.action === "direct_generate") {
    return true;
  }
  if (input.action === "override_rejection") {
    return (input.studentPriorViolations ?? 0) > 0;
  }
  if (input.action === "approve") {
    return (input.dailyBulkCount ?? 0) > BULK_THRESHOLD;
  }
  return false;
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

export async function getScopedTicket(ticketParam: string, userId: string, role: string) {
  const { query } = await import("@/lib/postgres");
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticketParam);
  const col = isUuid ? "id" : "ticket_number";
  const { rows } = await query<any>(
    `SELECT * FROM public.permissions WHERE ${col} = $1 LIMIT 1`,
    [ticketParam]
  );
  const req = rows[0];
  if (!req) return { notFound: true as const };

  if (role === "student" && req.student_user_id !== userId && req.requester_user_id !== userId) {
    return { forbidden: true as const };
  }
  return { request: req };
}

export function applyPermissionAction(
  ticket: RequestSnapshot,
  actor: ActorContext,
  options: { action: string; comment?: string; targetRole?: string; stepupVerified?: boolean; actorBranch?: string | null; requesterBranch?: string | null }
) {
  const role = actor.role;
  const currentStage = ticket.current_stage;
  const workflowType = ticket.workflow_type;

  if (role !== "admin" && role !== "sysadmin" && !canApproveAtStage(role, workflowType, currentStage)) {
    throw new PermissionRuleError("FORBIDDEN_STAGE", "User not authorized at this stage");
  }

  if (ticket.status === "CANCELLED" || ticket.status === "COMPLETED" || ticket.status === "REJECTED") {
    throw new PermissionRuleError("TERMINAL_STATE", "Cannot act on terminal ticket");
  }

  let nextStage = currentStage;
  let nextStatus = ticket.status;
  let auditAction = "PERMISSION_ACTION";

  if (options.action === "APPROVE") {
    const next = resolveNextStage(workflowType, currentStage);
    if (!next || next === "completed") {
      nextStage = "completed";
      nextStatus = "APPROVED";
      auditAction = "PERMISSION_APPROVED";
    } else {
      nextStage = next;
      auditAction = "PERMISSION_APPROVED";
    }
  } else if (options.action === "REJECT") {
    nextStage = "rejected";
    nextStatus = "REJECTED";
    auditAction = "PERMISSION_REJECTED";
  } else if (options.action === "CANCEL") {
    nextStage = "cancelled";
    nextStatus = "CANCELLED";
    auditAction = "PERMISSION_CANCELLED";
  }

  const updates = {
    current_stage: nextStage,
    status: nextStatus,
    stage_history: appendStageHistory(ticket.stage_history, actor, options.action, options.comment, { from: currentStage, to: nextStage }),
  };

  return {
    updates,
    effects: {
      auditAction,
      notifyUserId: ticket.student_user_id,
      notifyMessage: `Ticket ${ticket.ticket_number} updated to ${nextStatus}`,
    },
  };
}
