// src/lib/action-envelope.ts
// The action contract: every mutation in the system speaks this shape.
// No role component may call fetch directly — they dispatch an envelope
// through dispatch-action.

export type ActionTier = 0 | 1 | 2 | 3 | 4;

export interface ActionEnvelope {
  /** Namespaced action type, e.g. 'assignment.create', 'submission.grade' */
  type: string;
  /** Target record id (assignment, submission, request, etc.) */
  targetId?: string;
  /** The acting user id (server verifies; client sends for convenience) */
  actorId: string;
  /** The acting role (server re-checks against binding/role) */
  actorRole: string;
  /** Action-specific payload (subject, files, grade, reason, …) */
  payload?: Record<string, unknown>;
  /** Required for declines and tier ≥ 3 */
  reason?: string;
  /** Client-generated; server dedupes on this. */
  idempotencyKey: string;
}

export interface ActionResult {
  status: "ok" | "denied" | "conflict" | "expired";
  recordId?: string;
  error?: string;
}

/**
 * Per-role action registry. Each role declares its actions here;
 * dispatch-action reads the tier + confirm mode from this table,
 * not from developer judgement at render time.
 */
export interface ActionDef {
  type: string;
  tier: ActionTier;
  /** UI confirm mode: none | inline | dialog | stepup | cosign */
  confirm: "none" | "inline" | "dialog" | "stepup" | "cosign";
  /** If true, the server requires a reason field on decline/reject. */
  reasonRequired?: boolean;
  /** Short human-readable description for audit log. */
  label?: string;
}
