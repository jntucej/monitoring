import type {
  StageHistoryEntry,
  RequestSnapshot,
  ActorContext,
} from "@/lib/permission-workflow-core";
import {
  appendStageHistory,
  PermissionRuleError,
} from "@/lib/permission-workflow-core";

export const L1_ROLE = "caretaker";
export const L2_ROLE = "deputy_warden";
export const L3_ROLE = "hostel_manager";
export const L4_ROLE = "principal";
const HOSTEL_CHAIN = [L1_ROLE, L2_ROLE, L3_ROLE, L4_ROLE] as const;

function normalize(role: string | null | undefined): string | null {
  if (!role) return null;
  return role === "warden" ? L3_ROLE : role;
}

export function resolveInitialHostelStage(): string {
  return L1_ROLE;
}

export function nextHostelLevel(current: string): string | null {
  const idx = HOSTEL_CHAIN.indexOf(current as (typeof HOSTEL_CHAIN)[number]);
  if (idx === -1 || idx === HOSTEL_CHAIN.length - 1) return null;
  return HOSTEL_CHAIN[idx + 1];
}

export function levelsAbove(current: string): string[] {
  const idx = HOSTEL_CHAIN.indexOf(current as (typeof HOSTEL_CHAIN)[number]);
  if (idx === -1) return [];
  return HOSTEL_CHAIN.slice(idx + 1);
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
  const role = normalize(input.actorRole);
  if (input.action === "forward") {
    return (
      role === L3_ROLE &&
      input.targetRole === L4_ROLE &&
      (input.reason === "home_out" || input.reason === "special_leave")
    );
  }
  if (input.action === "direct_generate") return true;
  if (input.action === "override_rejection") {
    return (input.studentPriorViolations ?? 0) > 0;
  }
  if (input.action === "approve") {
    return (input.dailyBulkCount ?? 0) > BULK_THRESHOLD;
  }
  return false;
}

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
  const actorRole = normalize(input.actor.role);
  const targetRole = normalize(input.targetRole);
  if (!targetRole) {
    throw new PermissionRuleError("INVALID_TARGET", "Target role required");
  }
  if (!HOSTEL_CHAIN.includes(targetRole as (typeof HOSTEL_CHAIN)[number])) {
    throw new PermissionRuleError(
      "INVALID_TARGET",
      `Target role ${targetRole} not in hostel hierarchy`,
    );
  }
  const currentStage = normalize(input.ticket.current_stage) ?? L1_ROLE;
  const currentIdx = HOSTEL_CHAIN.indexOf(currentStage as (typeof HOSTEL_CHAIN)[number]);
  const targetIdx = HOSTEL_CHAIN.indexOf(targetRole as (typeof HOSTEL_CHAIN)[number]);
  if (targetIdx <= currentIdx) {
    throw new PermissionRuleError(
      "CANNOT_FORWARD_BACKWARD",
      `Cannot forward from ${currentStage} to ${targetRole}`,
    );
  }
  if (
    requiresStepup({
      actorRole: actorRole ?? "",
      action: "forward",
      targetRole,
    }) &&
    !input.stepupVerified
  ) {
    throw new PermissionRuleError(
      "STEPUP_REQUIRED",
      "Step-up approval password required for this forward",
    );
  }
  const now = new Date().toISOString();
  const updates: HostelForwardUpdates = {
    current_stage: targetRole,
    stage_history: appendStageHistory(
      input.ticket.stage_history,
      input.actor,
      "FORWARD",
      input.comment,
      { from: currentStage, to: targetRole },
    ),
    routed_to_role: targetRole,
    forwarded_from_role: actorRole ?? currentStage,
    forward_comment: input.comment,
  };
  if (input.stepupVerified) {
    updates.stepup_verified_at = now;
  }
  return {
    updates,
    effects: {
      auditAction: "PERMISSION_FORWARDED_TO_LEVEL",
      notifyUserId: (input.ticket as any).student_user_id,
      notifyMessage: `Ticket ${input.ticket.ticket_number} forwarded to ${targetRole}`,
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
  if (!input.stepupVerified) {
    throw new PermissionRuleError(
      "STEPUP_REQUIRED",
      "Direct-generate requires step-up approval password",
    );
  }
  const now = new Date().toISOString();
  const updates: DirectGenUpdates = {
    status: "APPROVED",
    current_stage: "completed",
    direct_generated: true,
    reason: input.reason,
    from: input.from,
    to: input.to,
    note: input.note,
    stepup_verified_at: now,
    stage_history: [
      {
        stage: "direct",
        actor: input.actor,
        action: "DIRECT_GENERATE",
        comment: input.note ?? null,
        timestamp: now,
        transition: { from: "none", to: "completed" },
      },
    ],
  };
  return {
    updates,
    effects: {
      auditAction: "PERMISSION_DIRECT_GENERATED",
      notifyUserId: input.studentUserId,
      notifyMessage: `Direct pass generated for ${input.reason}`,
    },
  };
}

export interface EntryOptions {
  buttons: ("return_to_hostel" | "home_in" | "day_scholar_in")[];
  allowsTypeChoice: boolean;
}

export function resolveEntryOptions(
  lastOutReason: string | null,
  currentType: "hosteller" | "day_scholar" | null,
): EntryOptions {
  void currentType;
  // Mirror permission-workflow-core.resolveEntryOptions exactly (single source
  // of truth). The caller (record.ts / ScanConfirmation) passes the stored
  // current_entry_type but the button set is driven only by lastOutReason:
  // - daily_outing / day_pass / emergency → pinned to [return_to_hostel]
  // - day_scholar_out                     → pinned to [day_scholar_in]
  // - home_out / special_leave / null (first scan) → [home_in, day_scholar_in], type choice
  const reason = (lastOutReason ?? "").toLowerCase();
  if (reason === "daily_outing" || reason === "day_pass" || reason === "emergency") {
    return { buttons: ["return_to_hostel"], allowsTypeChoice: false };
  }
  if (reason === "day_scholar_out") {
    return { buttons: ["day_scholar_in"], allowsTypeChoice: false };
  }
  // home_out, special_leave, or null (first scan / no prior OUT). A first
  // scan has no prior OUT by construction, so offering both home_in
  // (hosteller) and day_scholar_in lets the operator pick the correct entry
  // type. Picking home_in sets the stored entry type to hosteller; picking
  // day_scholar_in sets it to day_scholar. The recordScan home_in guard
  // (step 10c) rejects a home_in with no matching prior home_out with a
  // clean 400, not silent corruption.
  return { buttons: ["home_in", "day_scholar_in"], allowsTypeChoice: true };
}

export { PermissionRuleError };
export type { StageHistoryEntry, RequestSnapshot, ActorContext };
