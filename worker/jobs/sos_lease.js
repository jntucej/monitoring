// worker/jobs/sos_lease.js
import { getWorkerDbPool } from "../db.js";

export async function runSosLease() {
  const pool = getWorkerDbPool();
  const { rows: stale } = await pool.query(
    `SELECT s.id
       FROM public.sos_requests s
      WHERE s.status = 'open'
        AND s.created_at < NOW() - INTERVAL '30 seconds'
        AND NOT EXISTS (
          SELECT 1 FROM public.sos_dispatch d
           WHERE d.sos_id = s.id AND d.status IN ('accepted', 'en_route', 'on_scene')
        )
      LIMIT 20`,
  );

  let expired = 0;
  for (const s of stale) {
    const res = await pool.query(
      `UPDATE public.sos_dispatch
          SET status = 'expired'
        WHERE sos_id = $1::uuid AND status = 'offered' AND assigned_at < NOW() - INTERVAL '30 seconds'`,
      [s.id],
    );
    expired += res.rowCount ?? 0;
  }
  return { checked: stale.length, expired };
}
