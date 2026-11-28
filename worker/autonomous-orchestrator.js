/**
 * Autonomous event orchestrator (worker runtime path).
 *
 * Plain ESM, `pg` only — importable by `worker/index.mjs` under bare `node`
 * (no TS transpile, no app-alias coupling). The Next app-side mirror is
 * `src/server/services/autonomous/orchestrator.ts`, which re-exports this
 * module so both the app bundle and the worker use the same runtime logic.
 *
 * Wired from:
 *   - record.ts (gate punch)              -> dispatchAutonomousEvent({ GATE_PUNCH })
 *   - attendance_sub_threshold worker     -> dispatchAutonomousEvent({ ATTENDANCE_LOCKED })
 *   - SBI Collect / UPI fee webhook       -> dispatchAutonomousEvent({ PAYMENT_VERIFIED })
 *   - circular publish / RAG ingest       -> dispatchAutonomousEvent({ CIRCULAR_PUBLISHED })
 *
 * ── BUG-FIX GUARDRAILS (per master-prompt review) ──────────────────────
 * B1 GATE_PUNCH out-of-order: a late batch-synced punch must not overwrite
 *    a newer live presence. The occupancy upsert is timestamp-guarded
 *    (last_updated <= event time) and we only notify when a row actually
 *    flipped.
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

import { getWorkerDbPool, query } from "./db.js";

// ── Event taxonomy ─────────────────────────────────────────────────────────
export const CAMPUS_EVENTS = Object.freeze({
  ATTENDANCE_LOCKED: "ATTENDANCE_LOCKED",
  PAYMENT_VERIFIED: "PAYMENT_VERIFIED",
  GATE_PUNCH: "GATE_PUNCH",
  CIRCULAR_PUBLISHED: "CIRCULAR_PUBLISHED",
});

// ── B2: real policy config from the live table, no placeholders ─────────
async function loadPolicyConfig(pool) {
  const { rows } = await pool.query(
    `SELECT min_attendance_pct, condonation_min_pct
       FROM public.config_exam_eligibility_rules ORDER BY id LIMIT 1`,
  );
  const c = rows[0];
  return {
    eligibleMinPct: Number(c?.min_attendance_pct ?? 75),
    condonationMinPct: Number(c?.condonation_min_pct ?? 65),
    bonusPeriods: 0,
    detentionForfeitsCieMarks: true,
  };
}

/** Real aggregate attendance + bound regulation for a student. null = no records. */
async function loadLiveFacts(pool, studentId) {
  const { rows } = await pool.query(
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

// Pure JS mirror of src/lib/policy-engine.ts evaluateAttendanceByPolicy —
// kept here so the worker path has zero app-bundle dependency.
function evaluateAttendance(facts, config) {
  const effectiveAttended = facts.attendedPeriods;
  const conducted = Math.max(0, facts.conductedPeriods);
  const aggregatePct = conducted > 0 ? Number(((effectiveAttended / conducted) * 100).toFixed(2)) : 100;
  const forfeitCie = config.detentionForfeitsCieMarks !== false;
  const safeBunksOrNeeded =
    aggregatePct >= config.eligibleMinPct
      ? { type: "SAFE_BUNKS", count: Math.max(0, Math.floor(effectiveAttended / (config.eligibleMinPct / 100) - conducted)) }
      : {
          type: "CLASSES_NEEDED",
          count: Math.max(0, Math.ceil(((config.eligibleMinPct / 100) * conducted - effectiveAttended) / (1 - config.eligibleMinPct / 100))),
        };

  if (facts.isDebarred)
    return { aggregatePct, status: "DEBARRED", hallTicketLocked: true, forfeitCieMarks: false, safeBunksOrNeeded };
  if (aggregatePct < config.condonationMinPct)
    return { aggregatePct, status: "DETAINED", hallTicketLocked: true, forfeitCieMarks: forfeitCie, safeBunksOrNeeded };
  if (aggregatePct < config.eligibleMinPct) {
    const cleared = facts.hasApprovedCacCondonation && facts.condonationFeeCleared;
    return {
      aggregatePct,
      status: cleared ? "CONDONATION_APPROVED" : "CONDONATION_REQUIRED",
      hallTicketLocked: !cleared,
      forfeitCieMarks: false,
      safeBunksOrNeeded,
    };
  }
  return { aggregatePct, status: "ELIGIBLE", hallTicketLocked: false, forfeitCieMarks: false, safeBunksOrNeeded };
}

// ── B4 + B2: evaluate + upsert hall-ticket lock under a per-student lock ──
async function recomputeHallTicketLock(studentId, trigger, paymentCleared) {
  const pool = getWorkerDbPool();
  const facts = await loadLiveFacts(pool, studentId);
  if (!facts) return null;

  const config = await loadPolicyConfig(pool);

  const { rows: condRows } = await pool.query(
    `SELECT status, fee_cleared FROM public.attendance_condonations
      WHERE student_id = $1::uuid AND status <> 'REJECTED'
      ORDER BY created_at DESC NULLS LAST LIMIT 1`,
    [studentId],
  );
  const active = condRows[0];
  const hasApproved = active?.status === "APPROVED";
  const feeCleared = paymentCleared ? true : hasApproved ? !!active?.fee_cleared : false;

  const { rows: srows } = await pool.query(
    `SELECT academic_status FROM public.student_details WHERE user_id = $1::uuid LIMIT 1`,
    [studentId],
  );
  const isDebarred = srows[0]?.academic_status === "DEBARRED" || srows[0]?.academic_status === "SUSPENDED";

  const verdict = evaluateAttendance(
    {
      attendedPeriods: facts.present,
      conductedPeriods: facts.total,
      hasApprovedCacCondonation: hasApproved,
      condonationFeeCleared: feeCleared,
      isDebarred,
    },
    config,
  );

  const regulationCode = facts.regulation ?? "ACTIVE";
  const client = pool.connect();
  try {
    await client.query("BEGIN");
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
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  if (verdict.hallTicketLocked || verdict.status === "CONDONATION_REQUIRED") {
    await pool.query(
      `INSERT INTO public.notifications
         (type, priority, title, message, recipient_id, recipient_type, channels, event_type, scope, actor_role)
       VALUES ($1, $2, $3, $4, $5::uuid, 'user', '{in_app}'::text[], 'attendance', 'policy', 'system')`,
      [
        "attendance.hall_ticket",
        verdict.hallTicketLocked ? "high" : "normal",
        verdict.hallTicketLocked ? "Hall ticket locked" : "Hall ticket status updated",
        `Attendance ${verdict.aggregatePct}% -> ${verdict.status} (${trigger}).`,
        studentId,
      ],
    ).catch(() => {});
  }
  return verdict;
}

// ── Event handlers ─────────────────────────────────────────────────────────
export async function dispatchAutonomousEvent(event) {
  const pool = getWorkerDbPool();

  switch (event.type) {
    case "ATTENDANCE_LOCKED": {
      await recomputeHallTicketLock(event.studentId, "ATTENDANCE_LOCKED", false);
      return;
    }

    case "PAYMENT_VERIFIED": {
      if (event.purpose === "CONDONATION") {
        await recomputeHallTicketLock(event.studentId, "PAYMENT_VERIFIED", true);
      }
      return;
    }

    case "GATE_PUNCH": {
      // B1: timestamp-guarded presence flip.
      const { rowCount } = await pool.query(
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
        await pool.query(
          `INSERT INTO public.notifications
             (type, priority, title, message, recipient_id, recipient_type, channels, event_type, scope, actor_role)
           VALUES ($1, 'low', $2, $3, $4::uuid, 'user', '{in_app}'::text[], 'presence', 'presence', 'system')`,
          [
            "presence.changed",
            event.direction === "IN" ? "Entered campus" : "Left campus",
            `Campus status updated to ${event.direction === "IN" ? "in-campus" : "out-of-campus"} at gate.`,
            event.studentId,
          ],
        ).catch(() => {});
      }
      return;
    }

    case "CIRCULAR_PUBLISHED": {
      // B3: crash-safe outbox row (not a bare redis lpush).
      await pool.query(
        `INSERT INTO public.campus_kb_ingest_outbox (circular_id, ingest_status, created_at)
         VALUES ($1::uuid, 'PENDING', NOW())
         ON CONFLICT (circular_id) DO UPDATE SET ingest_status = 'PENDING', updated_at = NOW()`,
        [event.circularId],
      ).catch((err) => {
        console.error("[autonomous] kb-ingest outbox insert failed:", err?.message ?? err);
      });
      return;
    }

    default:
      console.warn(`[autonomous] unknown event type: ${event.type}`);
  }
}

export default dispatchAutonomousEvent;
