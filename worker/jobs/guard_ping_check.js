// worker/jobs/guard_ping_check.js
import { getWorkerDbPool } from "../db.js";

export async function runGuardPingCheck() {
  const pool = getWorkerDbPool();
  const { rows: silent } = await pool.query(
    `SELECT spa.operator_id, spa.shift_id
       FROM public.security_shifts sh
       JOIN public.shift_post_assignments spa ON spa.shift_id = sh.id
      WHERE sh.status IN ('published', 'active')
        AND NOW() BETWEEN sh.starts_at AND sh.ends_at
        AND spa.status = 'checked_in'
        AND NOT EXISTS (
          SELECT 1 FROM public.guard_live_location g
           WHERE g.operator_id = spa.operator_id
             AND g.shift_id = sh.id
             AND g.recorded_at > NOW() - INTERVAL '2 minutes'
        )`,
  );
  return { silent_guards: silent.length };
}
