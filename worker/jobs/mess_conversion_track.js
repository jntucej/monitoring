// worker/jobs/mess_conversion_track.js
// After a trial meal session closes, computes % of YES voters who actually scanned.
import { getWorkerDbPool } from "../db.js";

export async function runMessConversionTrack() {
  const pool = getWorkerDbPool();
  const { rows: candidates } = await pool.query(
    `SELECT p.id AS poll_id, d.id AS session_id
       FROM public.mess_interest_polls p
       JOIN public.mess_days d
         ON d.meal_date = p.scheduled_for AND d.meal_type = p.meal_type
      WHERE p.status = 'approved'
        AND d.window_closes_at < NOW()
        AND NOT EXISTS (
          SELECT 1 FROM public.mess_interest_conversions c WHERE c.poll_id = p.id
        )
      LIMIT 20`,
  );

  let recorded = 0;
  for (const row of candidates) {
    const { rows: yesRows } = await pool.query(
      `SELECT user_id FROM public.mess_interest_votes
        WHERE poll_id = $1::uuid AND vote = 'yes'`,
      [row.poll_id],
    );
    const yesIds = yesRows.map((r) => r.user_id);
    const yesCount = yesIds.length;
    let servedCount = 0;
    if (yesCount > 0) {
      const { rows: scanRows } = await pool.query(
        `SELECT COUNT(DISTINCT student_id)::int AS cnt
           FROM public.mess_scan_events
          WHERE session_id = $1::uuid
            AND outcome = 'ok'
            AND student_id = ANY($2::uuid[])`,
        [row.session_id, yesIds],
      );
      servedCount = scanRows[0]?.cnt ?? 0;
    }
    const pct = yesCount > 0 ? Number((servedCount / yesCount).toFixed(4)) : 0;
    await pool.query(
      `INSERT INTO public.mess_interest_conversions
         (poll_id, session_id, yes_voters, actually_served, conversion_pct)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5)
       ON CONFLICT (poll_id) DO NOTHING`,
      [row.poll_id, row.session_id, yesCount, servedCount, pct],
    );
    recorded++;
  }
  return { recorded };
}
