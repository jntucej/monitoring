// worker/jobs/shift_auto_close.js
import { getWorkerDbPool } from "../db.js";

export async function runShiftAutoClose() {
  const pool = getWorkerDbPool();
  const { rows: closed } = await pool.query(
    `UPDATE public.security_shifts
        SET status = 'closed', closed_at = NOW()
      WHERE status IN ('published', 'active')
        AND ends_at < NOW()
      RETURNING id`,
  );

  for (const sh of closed) {
    await pool.query(
      `UPDATE public.shift_post_assignments
          SET status = CASE WHEN status = 'assigned' THEN 'no_show' ELSE 'checked_out' END,
              checked_out_at = CASE WHEN status = 'checked_in' THEN NOW() ELSE checked_out_at END
        WHERE shift_id = $1::uuid AND status IN ('assigned', 'checked_in')`,
      [sh.id],
    );
  }
  return { closed_shifts: closed.length };
}
