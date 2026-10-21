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

// ── Entry-option resolver (gate operator button matrix) ───────────────────────

/**
 * Result of {@link resolveEntryOptions}.
 *
 * `buttons` is the set of IN-moves the gate operator console should offer for a
 * student who was last scanned OUT (or has no prior OUT). `allowsTypeChoice`
 * signals whether the operator may freely pick the entry type (hosteller vs
 * day scholar) rather than being pinned to a single button that mirrors the
 * prior OUT reason.
 */
export interface EntryOptions {
  buttons: ("return_to_hostel" | "home_in" | "day_scholar_in")[];
  allowsTypeChoice: boolean;
}

/**
 * Pure resolver for the gate-operator IN-moves offered after a student's last
 * known OUT reason. Fully client-safe (no DB / pg / Node builtins).
 *
 * Rules:
 * - prior `daily_outing` / `day_pass`  → pinned to `[return_to_hostel]`, no type choice.
 * - prior `day_scholar_out`            → pinned to `[day_scholar_in]`, no type choice.
 * - prior `home_out` (or unknown)      → `[home_in, day_scholar_in]`, type choice.
 * - no prior OUT (`null`) / first scan → `[home_in, day_scholar_in]`, type choice.
 */
export function resolveEntryOptions(
  lastOutReason: string | null,
  currentType: "hosteller" | "day_scholar" | null,
): EntryOptions {
  // `currentType` is part of the public contract but does not change the
  // button set today; it is reserved so callers can pass it forward without
  // the signature ever needing to break. (Unused by design → no lint noise
  // because it is a named param.)
  void currentType;

  if (lastOutReason === "daily_outing" || lastOutReason === "day_pass") {
    return { buttons: ["return_to_hostel"], allowsTypeChoice: false };
  }
  if (lastOutReason === "day_scholar_out") {
    return { buttons: ["day_scholar_in"], allowsTypeChoice: false };
  }
  // home_out (or any known leave reason that wasn't caught above)
  // → [home_in, day_scholar_in], type choice.
  // null (no prior OUT / first scan): do NOT offer home_in, since there's no
  // matching home_out to pair with — offering it would let an operator create
  // a phantom round-trip in movement_logs. Only allow day_scholar_in for a
  // first-scan entry.
  if (lastOutReason === null) {
    return { buttons: ["day_scholar_in"], allowsTypeChoice: false };
  }
  return { buttons: ["home_in", "day_scholar_in"], allowsTypeChoice: true };
}
