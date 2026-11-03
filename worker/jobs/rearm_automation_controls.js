// Batch J2 — dual-control re-arm for automation kill switches.
//
// Polls automation_controls_rearm_requests for rows with BOTH distinct
// approvals recorded. When found, flips the auto_* automation_controls
// rows back to enabled=TRUE (excluding auto_heal_enabled, which is a
// separate concern), records completed_at/completed_by, and writes an
// audit row. Runs on a 60s cadence — re-enable is deliberately slower
// than engage (the asymmetric design: engage is one admin + one UPDATE;
// re-enable is two distinct humans + this job).

import { getWorkerDbPool } from "../db.js";

export default async function completeRearmRequests() {
  const pool = getWorkerDbPool();

  const { rows } = await pool.query(
    `SELECT id, requested_by, approved_by_1, approved_by_2, reason
       FROM public.automation_controls_rearm_requests
      WHERE completed_at IS NULL
        AND approved_by_1 IS NOT NULL
        AND approved_by_2 IS NOT NULL
        AND approved_by_1 <> approved_by_2
      ORDER BY requested_at
      LIMIT 10`
  );

  if (rows.length === 0) return { completed: 0 };

  let completed = 0;
  for (const req of rows) {
    const res = await pool.query(
      `UPDATE public.automation_controls
          SET enabled = TRUE
        WHERE name LIKE 'auto_%' AND name <> 'auto_heal_enabled'
          AND enabled = FALSE`
    );
    await pool.query(
      `UPDATE public.automation_controls_rearm_requests
          SET completed_at = NOW(),
              completed_by = $2
        WHERE id = $1`,
      [req.id, req.approved_by_2]
    );
    await pool.query(
      `INSERT INTO public.audit_logs (action, user_id, user_name, role, details)
       VALUES ($1, $2, NULL, 'sysadmin', $3::jsonb)`,
      [
        "REARM_COMPLETED",
        req.approved_by_2,
        JSON.stringify({
          rearm_request_id: req.id,
          requested_by: req.requested_by,
          approved_by_1: req.approved_by_1,
          approved_by_2: req.approved_by_2,
          reason: req.reason ?? "",
          rows_rearmed: res.rowCount,
        }),
      ]
    );
    completed += 1;
    console.log(
      `[worker] rearm: request ${req.id} completed by ${req.approved_by_2} (${res.rowCount} switch(es) re-enabled)`
    );
  }

  return { completed };
}
