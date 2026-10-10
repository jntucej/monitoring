import { query } from "@/lib/postgres";
import type { Role, WorkflowType } from "@/lib/types";

export const WORKFLOW_STAGES: Record<WorkflowType, readonly string[]> = {
  hostel: ["caretaker", "deputy_warden", "hostel_manager", "warden_or_principal", "main_gate", "completed"],
  exam: ["faculty", "hod", "oie", "vice_principal", "principal", "completed"],
  memo: ["faculty", "hod", "oie", "vice_principal", "principal", "completed"],
  staff_leave: ["hod", "vice_principal", "principal", "completed"],
} as const;

export const ROLE_STAGE_PERMISSIONS: Record<string, readonly string[]> = {
  caretaker: ["caretaker"],
  deputy_warden: ["deputy_warden"],
  hostel_manager: ["hostel_manager"],
  warden: ["warden_or_principal"],
  principal: ["warden_or_principal", "principal"],
  exam_branch: ["exam_branch"],
  operator: ["main_gate"],
  faculty: ["faculty"],
  hod: ["hod"],
  oie: ["oie"],
  vice_principal: ["vice_principal"],
  sysadmin: ["*"],
  admin: ["*"],
};

const SEQ_MAP: Record<WorkflowType, { seq: string; prefix: string }> = {
  hostel: { seq: "public.hostel_ticket_seq", prefix: "HST" },
  exam: { seq: "public.exam_ticket_seq", prefix: "EXM" },
  memo: { seq: "public.memo_ticket_seq", prefix: "MEM" },
  staff_leave: { seq: "public.staff_leave_ticket_seq", prefix: "STF" },
};

/**
 * Generates a per-workflow formatted ticket number using database sequences.
 * Example: HST-1001, EXM-1001, MEM-1001, STF-1001.
 */
export async function generateTicketNumber(workflowType: WorkflowType): Promise<string> {
  const cfg = SEQ_MAP[workflowType] || { seq: "public.hostel_ticket_seq", prefix: "HST" };
  try {
    const res = await query<{ nextval: string | number }>(`SELECT nextval('${cfg.seq}') AS nextval;`);
    const val = res.rows[0]?.nextval;
    if (val !== undefined && val !== null) {
      return `${cfg.prefix}-${val}`;
    }
  } catch (err) {
    console.error(`[generateTicketNumber] Sequence fetch failed for ${workflowType}:`, err);
  }
  const fallback = Math.floor(1000 + Math.random() * 9000);
  return `${cfg.prefix}-${fallback}`;
}

/**
 * Resolves the starting stage for a given workflow.
 */
export function resolveInitialStage(workflowType: WorkflowType): string {
  return WORKFLOW_STAGES[workflowType]?.[0] || "caretaker";
}

/**
 * Resolves the subsequent stage in the workflow chain.
 */
export function resolveNextStage(workflowType: WorkflowType, currentStage: string): string | null {
  const chain = WORKFLOW_STAGES[workflowType];
  if (!chain) return null;
  const currentIndex = chain.indexOf(currentStage);
  if (currentIndex === -1 || currentIndex >= chain.length - 1) {
    return null;
  }
  return chain[currentIndex + 1];
}

/**
 * Determines whether a user with a given role can approve/act at the specified stage.
 */
export function canApproveAtStage(
  role: Role | string,
  _workflowType: WorkflowType,
  currentStage: string
): boolean {
  if (role === "sysadmin" || role === "admin") return true;
  const allowedStages = ROLE_STAGE_PERMISSIONS[role];
  if (!allowedStages) return false;
  if (allowedStages.includes("*")) return true;
  return allowedStages.includes(currentStage);
}

export interface StageHistoryEntry {
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  fromStage?: string;
  toStage?: string;
  comment?: string | null;
  timestamp: string;
}

/**
 * Appends an entry to the stage history array immutably.
 */
export function appendStageHistory(
  existing: unknown[] | null | undefined,
  actor: { id: string; name: string; role: string },
  action: string,
  comment?: string | null,
  stageChange?: { from?: string; to?: string }
): StageHistoryEntry[] {
  const history: StageHistoryEntry[] = Array.isArray(existing) ? [...(existing as StageHistoryEntry[])] : [];
  const entry: StageHistoryEntry = {
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    ...(stageChange?.from ? { fromStage: stageChange.from } : {}),
    ...(stageChange?.to ? { toStage: stageChange.to } : {}),
    comment: comment ?? null,
    timestamp: new Date().toISOString(),
  };
  history.push(entry);
  return history;
}
