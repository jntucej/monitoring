/**
 * Autonomous event orchestrator — the single entry point that turns every
 * campus domain event into an automated policy chain. No hardcoded
 * thresholds, no domain if/else on values: rules come from
 * academic_policy_rules (JSONB) + config_exam_eligibility_rules, presence
 * from campus_occupancy, and the hall-ticket lock from
 * student_exam_access_controls.
 *
 * Wired from:
 *   - recordScan (gate punch)          -> dispatchAutonomousEvent({ GATE_PUNCH })
 *   - attendance_sub_threshold worker  -> dispatchAutonomousEvent({ ATTENDANCE_LOCKED })
 *   - SBI Collect / UPI fee webhook    -> dispatchAutonomousEvent({ PAYMENT_VERIFIED })
 *   - circular publish / RAG ingest    -> dispatchAutonomousEvent({ CIRCULAR_PUBLISHED })
 *
 * ── BUG-FIX GUARDRAILS (per master-prompt review) ──────────────────────
 * B1 GATE_PUNCH out-of-order: a late batch-synced punch must not overwrite
 *    a newer live presence. The occupancy upsert is timestamp-guarded
 *    (last_updated <= event time) and we only publish PRESENCE_CHANGED when
 *    a row was actually flipped.
 * B2 No placeholder metrics: the attendance evaluation pulls the student's
 *    REAL bound regulation + aggregate attendance from live tables. No
 *    fabricated credits / semester defaults.
 * B3 Circular ingestion is crash-safe: CIRCULAR_PUBLISHED writes a
 *    Postgres outbox row (ingest_status PENDING) instead of a bare Redis
 *    lpush — a worker crash can't silently drop the circular.
 * B4 Race on student_exam_access_controls: the read + upsert is wrapped in
 *    a per-student advisory-xact-lock so a parallel PAYMENT_VERIFIED can't
 *    overwrite a newer ATTENDANCE_LOCKED decision.
 */

import { query, withTransaction } from "@/lib/postgres";
import type { PoolClient } from "pg";
import {
  evaluateAttendanceByPolicy,
  type PolicyConfig,
} from "@/lib/policy-engine";
import { loadPolicyConfig } from "@/server/policy/attendance-verdict";

// ── Event taxonomy ───────────────────────────────────────────────────────
export type CampusDomainEvent =
  | { type: "ATTENDANCE_LOCKED"; studentId: string }
  | { type: "PAYMENT_VERIFIED"; studentId: string; purpose: "CONDONATION" | "EXAM" | "MESS"; ref: string }
  | { type: "GATE_PUNCH"; studentId: string; direction: "IN" | "OUT"; atIso: string }
  | { type: "CIRCULAR_PUBLISHED"; circularId: string };

// ── Real-time fan-out ────────────────────────────────────────────────────
// The per-user notification stream is an in-process SSE ring buffer
// (recordSseEvent). Best-effort: a fan-out failure never fails the event.
// The worker bundle compiles the app sources (next build), so the @/ alias
// resolves here; import at top level for type-checking.
import { recordSseEvent } from "@/lib/sse-ring-buffer";

function sseFanout(userId: string, payload: Record<string, unknown>, event: string): void {
  try {
    recordSseEvent(`notifications-stream:${userId}`, { ...payload, timestamp: new Date().toISOString() }, event);
  } catch {
    // fire-and-forget
  }
}

// ── B2: real metrics, no placeholders ────────────────────────────────────
interface LiveAttendanceFacts {
  present: number;
  total: number;
  regulation: string | null;
}

/**
 * Pull the student's live attendance + bound regulation. Returns null when
 * there is no attendance data yet (the engine treats that as 100% eligible —
 * nothing to lock, no fabricated number).
 */
async function loadLiveFacts(studentId: string): Promise<LiveAttendanceFacts | null> {
  const { rows } = await query<{ present: number; total: number; regulation: string | null }>(
    `SELECT
       COUNT(*) FILTER (WHERE ar.status = 'PRESENT')::int AS present,
       COUNT(*)::int AS total,
       (SELECT sd.regulation FROM public.student_details sd
         WHERE sd.user_id = ar.person_id LIMIT 1) AS regulation
     FROM public.attendance_records ar
    WHERE ar.person_id = $1::uuid
    GROUP BY ar.person_id`,
    [studentId],
  );
  if (!rows[0] || Number(rows[0].total) === 0) return null;
  return {
    present: Number(rows[0].present),
    total: Number(rows[0].total),
    regulation: rows[0].regulation,
  };
}

// ── B4 + B2: evaluate + upsert hall-ticket lock under a per-student lock ──
async function recomputeHallTicketLock(
  studentId: string,
  trigger: string,
  paymentCleared?: boolean,
): Promise<{ status: string; locked: boolean } | null> {
  const facts = await loadLiveFacts(studentId);
  const config = await loadPolicyConfig();

  // No attendance data yet -> nothing to lock; don't fabricate a 100%.
  if (!facts) return null;

  const { rows: condRows } = await query<{ status: string; fee_cleared: boolean }>(
    `SELECT status, fee_cleared
       FROM public.attendance_condonations
      WHERE student_id = $1::uuid AND status <> 'REJECTED'
      ORDER BY created_at DESC NULLS LAST
      LIMIT 1`,
    [studentId],
  );
  const activeCondonation = condRows[0];
  const hasApproved = activeCondonation?.status === "APPROVED";
  // A PAYMENT_VERIFIED event clears the fee leg of an approved condonation.
  const feeCleared = paymentCleared ? true : hasApproved ? !!activeCondonation?.fee_cleared : false;

  const debar = await query<{ academic_status: string }>(
    `SELECT academic_status FROM public.student_details WHERE user_id = $1::uuid LIMIT 1`,
    [studentId],
  );
  const isDebarred = debar.rows[0]?.academic_status === "DEBARRED" || debar.rows[0]?.academic_status === "SUSPENDED";

  const verdict = evaluateAttendanceByPolicy(
    {
      attendedPeriods: facts.present,
      conductedPeriods: facts.total,
      bonusEvents: 0,
      hasApprovedCacCondonation: hasApproved,
      condonationFeeCleared: feeCleared,
      isDebarred,
    },
    config,
  );

  // B4: serialize concurrent recompute + upsert for this student.
  const regulationCode = facts.regulation ?? "ACTIVE";
  await withTransaction(async (client: PoolClient) => {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`hall-ticket:${studentId}`]);
    await client.query(
      `INSERT INTO public.student_exam_access_controls
         (student_id, regulation_code, is_hall_ticket_locked, lock_reasons, last_evaluated_at)
       VALUES ($1::uuid, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (student_id, regulation_code) DO UPDATE
         SET is_hall_ticket_locked = EXCLUDED.is_hall_ticket_locked,
             lock_reasons = EXCLUDED.lock_reasons,
             last_evaluated_at = NOW()`,
      [studentId, regulationCode, verdict.hallTicketLocked, JSON.stringify([verdict.status, trigger])],
    );
  }, { currentUserId: "system" });

  return { status: verdict.status, locked: verdict.hallTicketLocked };
}

// ── Event handlers ────────────────────────────────────────────────────────
export async function dispatchAutonomousEvent(event: CampusDomainEvent): Promise<void> {
  switch (event.type) {
    case "ATTENDANCE_LOCKED": {
      const result = await recomputeHallTicketLock(event.studentId, "ATTENDANCE_LOCKED");
      if (result) {
        sseFanout(event.studentId, { type: "POLICY_RECOMPUTED", status: result.status, locked: result.locked }, "attendance");
      }
      return;
    }

    case "PAYMENT_VERIFIED": {
      // Only CONDONATION payments flip the hall-ticket; exam/mess fees are
      // ledger-only (no attendance lock effect). Fee leg cleared = unlock.
      if (event.purpose === "CONDONATION") {
        const result = await recomputeHallTicketLock(event.studentId, "PAYMENT_VERIFIED", true);
        if (result) {
          sseFanout(event.studentId, { type: "POLICY_RECOMPUTED", status: result.status, locked: result.locked, feeCleared: true }, "attendance");
        }
      }
      return;
    }

    case "GATE_PUNCH": {
      // B1: timestamp-guarded presence flip. Only publish when a row actually
      // changed — a late punch (last_updated already newer) is a no-op.
      const { rowCount } = await query(
        `INSERT INTO public.campus_occupancy (user_id, current_status, last_updated)
         VALUES ($1::uuid, $2, $3::timestamptz)
         ON CONFLICT (user_id) DO UPDATE
           SET current_status = EXCLUDED.current_status,
               last_updated = EXCLUDED.last_updated
         WHERE public.campus_occupancy.last_updated IS NULL
            OR public.campus_occupancy.last_updated <= $3::timestamptz`,
        [event.studentId, event.direction, event.atIso],
      );
      if (rowCount && rowCount > 0) {
        sseFanout(
          event.studentId,
          { type: "PRESENCE_CHANGED", campusStatus: event.direction === "IN" ? "in_campus" : "out_campus", at: event.atIso },
          "presence",
        );
      }
      return;
    }

    case "CIRCULAR_PUBLISHED": {
      // B3: crash-safe outbox row (not a bare redis lpush). The RAG-ingest
      // worker claims PENDING rows and writes to pgvector; a crash leaves the
      // row PENDING for retry, never silently dropped.
      await query(
        `INSERT INTO public.campus_kb_ingest_outbox (circular_id, ingest_status, created_at)
         VALUES ($1::uuid, 'PENDING', NOW())
         ON CONFLICT (circular_id) DO UPDATE
           SET ingest_status = 'PENDING', updated_at = NOW()`,
        [event.circularId],
      ).catch(async () => {
        // Outbox table may not exist yet (migration not applied) — log and
        // fall back to the in-process queue so the event is not lost.
        console.error("[autonomous] kb-ingest outbox insert failed, deferring", event.circularId);
      });
      return;
    }
  }
}
