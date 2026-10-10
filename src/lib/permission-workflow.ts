import { query } from "@/lib/postgres";
import type { WorkflowType } from "@/lib/types";
export type { WorkflowType };

export const WORKFLOW_STAGES: Record<WorkflowType, string[]> = {
  hostel: ["caretaker", "deputy_warden", "hostel_manager", "warden_or_principal", "main_gate", "completed"],
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

export interface StageHistoryEntry {
  stage: string;
  actor_id: string;
  action: string;
  comment?: string;
  timestamp: string;
}

/**
 * Returns a new history array with the appended entry (do not mutate input).
 */
export function appendStageHistory(
  existing: StageHistoryEntry[] | unknown,
  actor: string,
  action: string,
  comment?: string
): StageHistoryEntry[] {
  const rawArray = (Array.isArray(existing) ? existing : []) as StageHistoryEntry[];
  const currentStage = rawArray.length > 0 ? rawArray[rawArray.length - 1].stage : "initial";
  const newEntry: StageHistoryEntry = {
    stage: currentStage,
    actor_id: actor,
    action,
    comment,
    timestamp: new Date().toISOString(),
  };
  return [...rawArray, newEntry];
}
