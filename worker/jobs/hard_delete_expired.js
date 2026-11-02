import { query } from '../db.js';

/**
 * Scheduled Job: Hard-purge soft-deleted users past the DPDP grace period.
 *
 * delete_user_with_auth sets deleted_at on users and child entities.
 * DPDP Act §20 requires erasure once the purpose is served — a soft-deleted
 * user who has been gone for HARD_DELETE_GRACE_DAYS (default 30) is purged:
 * sessions, user_achievements, and child rows are deleted; the audit_logs
 * rows are kept (they are the deletion record itself).
 *
 * Runs hourly under the worker's advisory-lock guard (worker/index.mjs).
 */
export default async function hardDeleteExpired() {
  const graceDays = parseInt(process.env.HARD_DELETE_GRACE_DAYS || '30', 10);
  console.log(`[Worker Job] Checking hard-delete expiry (${graceDays}-day grace period)...`);

  try {
    // 1. Find soft-deleted users past the grace period.
    const expired = await query(
      `SELECT id FROM public.users
       WHERE deleted_at IS NOT NULL
         AND deleted_at < NOW() - ($1 || ' days')::INTERVAL`,
      [graceDays]
    );
    if (expired.rows.length === 0) {
      console.log('[Worker Job] No users past hard-delete grace period.');
      return;
    }

    const userIds = expired.rows.map((r) => r.id);

    // 2. Purge per-user data. audit_logs is intentionally retained:
    //    it records the deletion itself and has its own rotation job.
    for (const uid of userIds) {
      const sess = await query(
        `DELETE FROM public.sessions WHERE user_id = $1::uuid`,
        [uid]
      );
      const ach = await query(
        `DELETE FROM public.user_achievements WHERE user_id = $1::uuid`,
        [uid]
      );
      const prefs = await query(
        `DELETE FROM public.notification_preferences WHERE user_id = $1::uuid`,
        [uid]
      );
      // Soft-deleted students: their detail rows stay until the user row
      // is deleted (FK constraints), so purge them here.
      const std = await query(
        `DELETE FROM public.student_details WHERE user_id = $1::uuid`,
        [uid]
      );
      const emp = await query(
        `DELETE FROM public.employee_details WHERE user_id = $1::uuid`,
        [uid]
      );
      const del = await query(
        `DELETE FROM public.users WHERE id = $1::uuid`,
        [uid]
      );
      console.log(
        `[Worker Job] Hard-purged user ${uid}: ` +
        `sessions=${sess.rowCount} achievements=${ach.rowCount} ` +
        `prefs=${prefs.rowCount} student_details=${std.rowCount} ` +
        `employee_details=${emp.rowCount} users=${del.rowCount}`
      );
    }
    console.log(`[Worker Job] Hard-purged ${userIds.length} expired users.`);
  } catch (err) {
    console.error('[Worker Job] hard-delete-expired failed:', err);
  }
}
