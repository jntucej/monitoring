/**
 * permission-workflow-core.ts
 *
 * Shared, fully-pure primitives used by both permission-workflow.ts (the
 * server-side workflow engine) and permission-workflow-pure.ts (the
 * client-safe hostel-permission decision engine).
 *
 * This module has zero server-only imports so it can be bundled into the
 * client graph without dragging `pg` or any Node builtins.
 */
import type { WorkflowType } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface StageHistoryEntry {
  stage?: string;
  actor_id?: string;
  actor?: string | { id: string; name?: string; role?: string };
  action: string;
  comment?: string | null;
  timestamp: string;
  transition?: { from?: string; to?: string };
}

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

// ── Error ────────────────────────────────────────────────────────────────────

export class PermissionRuleError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// ── Pure helper ─────────────────────────────────────────────────────────────

/** Returns a new history array with the appended entry (does not mutate input). */
export function appendStageHistory(
  existing: StageHistoryEntry[] | unknown,
  actor: string | { id: string; name?: string; role?: string },
  action: string,
  comment?: string | null,
  transition?: { from?: string; to?: string },
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
