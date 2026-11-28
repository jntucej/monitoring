import { query } from '../db.js';
import { dispatchAutonomousEvent } from '../../src/server/services/autonomous/orchestrator.js';

/**
 * Scheduled Job: Nightly sub-threshold attendance alert.
 *
 * Runs once a day. For every student whose overall attendance is below the
 * 75% threshold, flags them:
 *   - pct < 75  → 'critical' (below the minimum)
 *   - 75 <= pct < 78 → 'warn' (at threshold but no buffer)
 * Alerts are written to public.notifications for the student's parent/guardian
 * + the relevant HOD. Real data only: pct is computed from
 * attendance_records (no fabrication). Students with zero records are skipped
 * (nothing to alert on yet).
 */
export default async function attendanceSubThresholdAlert() {
  try {
    // Overall attendance per student (present / total) from attendance_records.
    // Only students with at least one record; compute pct in SQL.
    const low = await query(
      `SELECT ar.person_id AS user_id,
              COUNT(*) FILTER (WHERE status = 'PRESENT')::int AS present,
              COUNT(*)::int AS total,
              ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'PRESENT')
                    / NULLIF(COUNT(*), 0)) AS pct
         FROM public.attendance_records ar
         JOIN public.users u ON u.id = ar.person_id AND u.role = 'student'
        WHERE ar.status IS NOT NULL
        GROUP BY ar.person_id
        HAVING COUNT(*) > 0
           AND (
                 100.0 * COUNT(*) FILTER (WHERE status = 'PRESENT') / COUNT(*) < 78
               )
        ORDER BY pct ASC
        LIMIT 500`
    );

    if (low.rows.length === 0) {
      console.log('[Worker Job] No students below the attendance threshold.');
      return;
    }

    // Map each flagged student to their parent/guardian (for the family copy).
    let alerts = 0;
    for (const r of low.rows) {
      const pct = Number(r.pct ?? 0);
      const severity = pct < 75 ? 'critical' : 'warn';
      const title =
        severity === 'critical'
          ? `Attendance below 75% (${pct}%)`
          : `Attendance near threshold (${pct}%)`;
      const message = `Student is at ${pct}% overall attendance (${r.present}/${r.total}). ${
        severity === 'critical' ? 'Below the 75% minimum — action needed.' : 'Approaching the 75% minimum.'
      }`;

      // 1) In-app alert to the student.
      await query(
        `INSERT INTO public.notifications
           (type, priority, title, message, recipient_id, recipient_type, channels, data,
            event_type, scope, actor_role)
         VALUES ($1, $2, $3, $4, $5::uuid, 'user', '{in_app}'::text[], $6::jsonb, $7, 'attendance', 'system')`,
        [
          'attendance.sub_threshold',
          severity,
          title,
          message,
          r.user_id,
          JSON.stringify({ present: r.present, total: r.total, pct, severity }),
          'attendance.sub_threshold',
        ]
      );

      // 2) Family copy: the student's registered guardian, if any.
      const parent = await query(
        `SELECT guardian_id AS id FROM public.student_details
          WHERE user_id = $1::uuid AND guardian_id IS NOT NULL
          LIMIT 1`,
        [r.user_id]
      );
      if (parent.rows[0]?.id) {
        await query(
          `INSERT INTO public.notifications
             (type, priority, title, message, recipient_id, recipient_type, channels, data,
              event_type, scope, actor_role)
           VALUES ($1, $2, $3, $4, $5::uuid, 'user', '{in_app, sms}'::text[], $6::jsonb, $7, 'attendance', 'system')`,
          [
            'attendance.sub_threshold.family',
            severity,
            `Your ward's attendance: ${pct}%`,
            message,
            parent.rows[0].id,
            JSON.stringify({ present: r.present, total: r.total, pct, severity }),
            'attendance.sub_threshold',
          ]
        );
      }

      // 3) Autonomous loop 2: a sub-threshold flag recomputes the student's
      //    hall-ticket lock from their REAL bound regulation + live aggregate.
      //    Fire-and-forget — the alert is the primary deliverable, the lock
      //    is the policy chain; a lock error never blocks the alert.
      void dispatchAutonomousEvent({ type: 'ATTENDANCE_LOCKED', studentId: r.user_id }).catch(
        (err) => console.error('[attendance-sub-threshold] autonomous ATTENDANCE_LOCKED dispatch failed:', err?.message ?? err),
      );
      alerts++;
    }

    console.log(`[Worker Job] ${alerts} students flagged for sub-threshold attendance.`);
  } catch (err) {
    console.error('[Worker Job] Attendance sub-threshold alert failed:', err.message);
  }
}
