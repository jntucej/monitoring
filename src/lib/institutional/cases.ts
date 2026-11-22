// src/lib/institutional/cases.ts
//
// PR-02 — Case Engine. The universal Case system built on PR-01 contracts.
//
// createCase() opens a case in state CREATED with a stable human ref
// (TYPE-YYYY-NNNN, e.g. HOSTEL-2026-091). transitionCase() moves it
// through the CREATED → OPEN → RESOLVED → CLOSED | CANCELLED lifecycle.
// addCaseEvidence() links to EXISTING evidence (audit rows, scans, leave
// requests) — the case layer never copies evidence into its own tables.
//
// This module deliberately does NOT know any domain: no gate-pass logic,
// no hostel-leave logic, no principal-specific code. PR-13 migrates each
// domain onto it one at a time.

import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/lib/audit";
import type {
  Actor,
  CaseState,
  CaseType,
} from "@/lib/institutional/contracts";

// ── Ref generation ─────────────────────────────────────────────────────────

/**
 * Stable, human-keyed case reference: `TYPE-YYYY-NNNN`.
 * NNNN is the per-year, per-type running counter (zero-padded 4).
 * e.g. gate_pass → GATE_PASS-2026-0042.
 */
export function generateCaseRef(type: CaseType, when: Date = new Date()): string {
  const prefix = type.replace(/_/g, "_").toUpperCase();
  return `${prefix}-${when.getUTCFullYear()}`;
}

async function nextCaseRef(type: CaseType, when: Date = new Date()): Promise<string> {
  const prefix = generateCaseRef(type, when);
  const { rows } = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM public.cases WHERE ref LIKE $1`,
    [`${prefix}-%`],
  );
  const n = (rows[0]?.n ?? 0) + 1;
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

// ── Create ─────────────────────────────────────────────────────────────────

export interface CreateCaseInput {
  type: CaseType;
  subjectType: string;
  subjectId: string;
  origin?: string | null;
  risk?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  authorityRole?: string | null;
  /** The hat the authority_role acts under (contracts.ts RoleContext). */
  authorityContext?: string | null;
  /** entity_scopes.entity_code; NULL = campus-wide. */
  entityScope?: string | null;
  /** SLA due-by (PR-05 attaches the SLA instance; this is the denormalized copy). */
  slaDueAt?: Date | string | null;
  payload?: Record<string, unknown>;
  /** Actor who created it; if omitted the case is system-originated. */
  actor?: Actor;
}

export interface CaseRow {
  id: string;
  ref: string;
  type: CaseType;
  subject_type: string;
  subject_id: string;
  origin: string | null;
  state: CaseState;
  risk: string;
  authority_role: string | null;
  authority_context: string | null;
  entity_scope: string | null;
  sla_due_at: string | null;
  payload: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
}

export async function createCase(input: CreateCaseInput): Promise<CaseRow> {
  const ref = await nextCaseRef(input.type);
  const { rows } = await query<CaseRow>(
    `INSERT INTO public.cases
       (ref, type, subject_type, subject_id, origin, risk,
        authority_role, authority_context, entity_scope,
        sla_due_at, payload, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
     RETURNING *`,
    [
      ref,
      input.type,
      input.subjectType,
      input.subjectId,
      input.origin ?? null,
      input.risk ?? "LOW",
      input.authorityRole ?? null,
      input.authorityContext ?? null,
      input.entityScope ?? null,
      input.slaDueAt ?? null,
      JSON.stringify(input.payload ?? {}),
      input.actor?.id ?? null,
    ],
  );
  const c = rows[0];

  // The case's own event stream starts with 'created'.
  await addCaseEvent(c.id, "created", {
    origin: input.origin ?? null,
    payload_keys: Object.keys(input.payload ?? {}),
  }, input.actor);

  await logAuditEvent({
    action: "case.created",
    userId: input.actor?.id ?? "system",
    userName: input.actor?.name ?? "system",
    userRole: input.actor?.role ?? "system",
    details: { ref, type: input.type, subject: `${input.subjectType}/${input.subjectId}` },
  } as any);

  return c;
}

// ── Transition ────────────────────────────────────────────────────────────

export type CaseAction = "open" | "resolve" | "close" | "cancel";

/** Legal moves in the universal lifecycle. PR-03 adds per-workflow moves. */
export const LIFECYCLE: Record<CaseState, CaseAction[]> = {
  CREATED: ["open", "cancel"],
  OPEN: ["resolve", "close", "cancel"],
  RESOLVED: ["close"],
  CLOSED: [],
  CANCELLED: [],
};

const ACTION_TARGET: Record<CaseAction, CaseState> = {
  open: "OPEN",
  resolve: "RESOLVED",
  close: "CLOSED",
  cancel: "CANCELLED",
};

export interface TransitionCaseInput {
  caseId: string;
  action: CaseAction;
  detail?: Record<string, unknown>;
  actor?: Actor;
}

export async function transitionCase(input: TransitionCaseInput): Promise<CaseRow> {
  const { rows } = await query<CaseRow>(
    `SELECT state FROM public.cases WHERE id = $1 FOR UPDATE`,
    [input.caseId],
  );
  if (rows.length === 0) throw new Error(`case not found: ${input.caseId}`);

  const from: CaseState = rows[0].state;
  const allowed = LIFECYCLE[from] ?? [];
  if (!allowed.includes(input.action)) {
    throw new Error(`illegal case transition '${input.action}' from state '${from}' (allowed: ${allowed.join(", ") || "none"})`);
  }

  const to = ACTION_TARGET[input.action];
  const now = new Date();
  const upd = await query<CaseRow>(
    `UPDATE public.cases SET
       state = $2,
       resolved_by = CASE WHEN $2 IN ('RESOLVED','CLOSED') THEN $3 ELSE resolved_by END,
       resolved_at = CASE WHEN $2 = 'RESOLVED' THEN $4 ELSE resolved_at END,
       closed_at   = CASE WHEN $2 = 'CLOSED'   THEN $4 ELSE closed_at END
     WHERE id = $1
     RETURNING *`,
    [input.caseId, to, input.actor?.id ?? null, now.toISOString()],
  );

  await addCaseEvent(input.caseId, "transitioned", {
    from, to, action: input.action, ...input.detail,
  }, input.actor);

  // PR-11: every transition is audited under a stable action name
  // (case.opened / case.resolved / case.closed / case.cancelled) so the
  // audit ledger can reconstruct the whole lifecycle from one case id.
  await logAuditEvent({
    action: `case.${input.action}`,
    userId: input.actor?.id ?? "system",
    userName: input.actor?.name ?? "system",
    userRole: input.actor?.role ?? "system",
    details: {
      case_id: input.caseId,
      ref: upd.rows[0].ref,
      from,
      to,
      decision_no: input.detail?.decision_no ?? null,
    },
  } as any);

  return upd.rows[0];
}

// ── Read ───────────────────────────────────────────────────────────────────

export async function getCase(caseId: string): Promise<(CaseRow & { events: Array<{ event: string; detail: Record<string, unknown>; created_at: string }> }) | null> {
  const { rows } = await query<CaseRow>(
    `SELECT * FROM public.cases WHERE id = $1`,
    [caseId],
  );
  if (rows.length === 0) return null;
  const { rows: events } = await query<{ event: string; detail: Record<string, unknown>; created_at: string }>(
    `SELECT event, detail, created_at FROM public.case_events WHERE case_id = $1 ORDER BY created_at ASC`,
    [caseId],
  );
  return { ...rows[0], events };
}

export async function listCases(
  filter: { type?: CaseType; state?: CaseState; entityScope?: string; limit?: number } = {},
): Promise<CaseRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  // Track $n by pushing the placeholder AND the value together so the
  // numbering never skips (skipping $n is what broke pg's type inference).
  let n = 0;
  const push = (col: string, val: unknown) => { n += 1; params.push(val); clauses.push(`${col} = $${n}`); };
  if (filter.type) push("type", filter.type);
  if (filter.state) push("state", filter.state);
  if (filter.entityScope) push("entity_scope", filter.entityScope);
  n += 1;
  params.push(filter.limit ?? 100);
  const sql = `SELECT * FROM public.cases
    ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
    ORDER BY created_at DESC LIMIT $${n}`;
  const { rows } = await query<CaseRow>(sql, params);
  return rows;
}

// ── Evidence ──────────────────────────────────────────────────────────────

export interface AddEvidenceInput {
  caseId: string;
  kind: string;
  /** The id of the EXISTING record (audit_logs.id, leave_requests.id, ...). */
  referenceId: string;
  note?: string | null;
  actor?: Actor;
}

export async function addCaseEvidence(input: AddEvidenceInput): Promise<{ evidence_id: string }> {
  const { rows } = await query<{ evidence_id: string }>(
    `INSERT INTO public.case_evidence (case_id, kind, reference_id, note, added_by)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING evidence_id`,
    [input.caseId, input.kind, input.referenceId, input.note ?? null, input.actor?.id ?? null],
  );
  await addCaseEvent(input.caseId, "evidence_added", {
    kind: input.kind,
    reference_id: input.referenceId,
  }, input.actor);
  return { evidence_id: rows[0].evidence_id };
}

// ── Event stream ──────────────────────────────────────────────────────────

export async function addCaseEvent(
  caseId: string,
  event: string,
  detail: Record<string, unknown>,
  actor?: Actor,
): Promise<void> {
  await query(
    `INSERT INTO public.case_events (case_id, event, detail, actor_id, actor_type, role_context)
     VALUES ($1,$2,$3::jsonb,$4,$5,$6)`,
    [
      caseId,
      event,
      JSON.stringify(detail),
      actor?.id ?? null,
      actor ? "human" : "system",
      actor?.roleContext ?? null,
    ],
  ).catch(() => {
    /* event stream must never break the caller; case_events is advisory */
  });
}
