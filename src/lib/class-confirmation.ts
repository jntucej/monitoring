// src/lib/class-confirmation.ts
//
// Flow A — pre-class confirmation state machine. One record per
// (session, faculty) in public.class_confirmations. States:
//   PENDING    — the 1h-before prompt fired, faculty hasn't acted yet
//   CONFIRMED  — faculty (or an HOD on-behalf) confirmed intent to teach
//   NO_SHOW    — 30 min before start, still unconfirmed (HOD alerted)
//   SUBSTITUTED — a substitute was requested / approved (ties to substitution)
//
// Confirmation is INTENT; attendance is EVIDENCE. A CONFIRMED session that
// ends without attendance is a real no-show, surfaced by the cron as a HOD
// alert — not by this resolver.

import { query } from "@/lib/postgres";

export type ConfirmationStatus = "PENDING" | "CONFIRMED" | "NO_SHOW" | "SUBSTITUTED";

export interface ConfirmationRecord {
  sessionId: string;
  facultyId: string;
  classId?: string;
  periodNo?: number;
  sessionDate?: string;
  status: ConfirmationStatus;
  confirmedAt?: string;
  confirmedBy?: string;
  substituteFacultyId?: string;
  substituteRequestedAt?: string;
}

/**
 * Record a faculty confirmation (CONFIRMED) or substitute request
 * (SUBSTITUTED). Idempotent: re-confirming an already-CONFIRMED session is a
 * no-op (the first confirmedAt is kept). Returns the resulting status.
 */
export async function recordConfirmation(input: {
  sessionId: string;
  facultyId: string;
  action: "confirm" | "request-substitute";
  actorId: string;
  substituteFacultyId?: string;
  // Denormalized session context (the session id is a hash — unparseable).
  classId?: string;
  periodNo?: number;
  sessionDate?: string;
}): Promise<{ status: ConfirmationStatus; changed: boolean }> {
  const now = new Date().toISOString();

  const { rows: existing } = await query<ConfirmationRecord>(
    `SELECT session_id AS sessionId, faculty_id::text AS facultyId,
            class_id::text AS classId, period_no AS periodNo, session_date::text AS sessionDate,
            status, confirmed_at::text AS confirmedAt, confirmed_by::text AS confirmedBy,
            substitute_faculty_id::text AS substituteFacultyId,
            substitute_requested_at::text AS substituteRequestedAt
       FROM public.class_confirmations
      WHERE session_id = $1 AND faculty_id = $2 LIMIT 1`,
    [input.sessionId, input.facultyId],
  );
  const cur = existing[0];

  if (input.action === "confirm") {
    // Already confirmed → no-op (keep the original timestamp = audit trail).
    if (cur?.status === "CONFIRMED") {
      return { status: "CONFIRMED", changed: false };
    }
    await query(
      `INSERT INTO public.class_confirmations
         (session_id, faculty_id, class_id, period_no, session_date,
          status, confirmed_at, confirmed_by)
       VALUES ($1, $2, $3, $4, $5, 'CONFIRMED', $6, $7)
       ON CONFLICT (session_id, faculty_id) DO UPDATE
         SET status = 'CONFIRMED',
             confirmed_at = COALESCE(class_confirmations.confirmed_at, $6),
             confirmed_by = COALESCE(class_confirmations.confirmed_by, $7),
             updated_at = NOW()`,
      [input.sessionId, input.facultyId, input.classId ?? null,
       input.periodNo ?? null, input.sessionDate ?? null, now, input.actorId],
    );
    return { status: "CONFIRMED", changed: true };
  }

  // request-substitute → SUBSTITUTED (ties into the substitution flow).
  if (cur?.status === "SUBSTITUTED" && cur.substituteFacultyId === input.substituteFacultyId) {
    return { status: "SUBSTITUTED", changed: false };
  }
  await query(
    `INSERT INTO public.class_confirmations
       (session_id, faculty_id, class_id, period_no, session_date,
        status, substitute_faculty_id, substitute_requested_at)
     VALUES ($1, $2, $3, $4, $5, 'SUBSTITUTED', $6, $7)
     ON CONFLICT (session_id, faculty_id) DO UPDATE
       SET status = 'SUBSTITUTED',
           substitute_faculty_id = $6,
           substitute_requested_at = $7,
           updated_at = NOW()`,
    [input.sessionId, input.facultyId, input.classId ?? null,
     input.periodNo ?? null, input.sessionDate ?? null,
     input.substituteFacultyId ?? null, now],
  );
  return { status: "SUBSTITUTED", changed: true };
}

/** Resolve the effective confirmation state for a session (for the UI card). */
export async function getConfirmationState(
  sessionId: string,
  facultyId?: string,
): Promise<ConfirmationRecord | null> {
  const fidClause = facultyId ? `AND faculty_id = $2` : "";
  const params = facultyId ? [sessionId, facultyId] : [sessionId];
  const { rows } = await query<ConfirmationRecord>(
    `SELECT session_id AS sessionId, faculty_id::text AS facultyId,
            class_id::text AS classId, period_no AS periodNo, session_date::text AS sessionDate,
            status, confirmed_at::text AS confirmedAt, confirmed_by::text AS confirmedBy,
            substitute_faculty_id::text AS substituteFacultyId,
            substitute_requested_at::text AS substituteRequestedAt
       FROM public.class_confirmations
      WHERE session_id = $1 ${fidClause}
      ORDER BY confirmed_at DESC NULLS LAST
      LIMIT 1`,
    params,
  );
  return rows[0] ?? null;
}

/**
 * Mark every PENDING confirmation for a session as NO_SHOW (called by the
 * cron 30 min before start when no confirmation was recorded). Returns the
 * count flipped.
 */
export async function markNoShow(sessionId: string): Promise<number> {
  const { rowCount } = await query(
    `UPDATE public.class_confirmations
        SET status = 'NO_SHOW', updated_at = NOW()
      WHERE session_id = $1 AND status = 'PENDING'`,
    [sessionId],
  );
  return rowCount ?? 0;
}
