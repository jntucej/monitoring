// worker/jobs/presence_reconcile.js
import { getWorkerDbPool } from "../db.js";

export async function runPresenceReconcile() {
  const pool = getWorkerDbPool();
  const res = await pool.query(
    `INSERT INTO public.student_presence (student_id, state, since, last_scan_id, last_scan_at, updated_at)
     SELECT DISTINCT ON (ml.user_id)
            ml.user_id,
            CASE
              WHEN (ml.category = 'hostel' OR g.type = 'hostel') AND ml.direction = 'IN' THEN 'in_hostel'
              WHEN (ml.category = 'hostel' OR g.type = 'hostel') AND ml.direction = 'OUT' THEN 'on_campus'
              WHEN (ml.category = 'main' OR g.type = 'main') AND ml.direction = 'OUT' THEN 'out'
              ELSE 'on_campus'
            END,
            ml.timestamp,
            ml.id,
            ml.timestamp,
            NOW()
       FROM public.movement_logs ml
       LEFT JOIN public.gates g ON g.id = ml.gate_id
       LEFT JOIN public.student_presence sp ON sp.student_id = ml.user_id
      WHERE ml.timestamp > NOW() - INTERVAL '1 hour'
        AND (sp.last_scan_at IS NULL OR ml.timestamp > sp.last_scan_at)
      ORDER BY ml.user_id, ml.timestamp DESC
     ON CONFLICT (student_id) DO UPDATE SET
       state = EXCLUDED.state,
       since = EXCLUDED.since,
       last_scan_id = EXCLUDED.last_scan_id,
       last_scan_at = EXCLUDED.last_scan_at,
       updated_at = NOW()`,
  );
  return { reconciled: res.rowCount ?? 0 };
}
