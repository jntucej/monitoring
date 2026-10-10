import { query } from "@/lib/postgres";
import type { Role, WorkflowType } from "@/lib/types";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { getParentChildren } from "@/lib/db";

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

/* ------------------------------------------------------------------ *
 *  TICKET VISIBILITY SCOPING (shared by [ticket] routes — Step 7)
 * ------------------------------------------------------------------ */

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
