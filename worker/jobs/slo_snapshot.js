// worker/jobs/slo_snapshot.js
// Batch I3: SLO snapshot job.
//
// Evaluates every active SLO's metric_query against Prometheus via
// MONITORING_PROM_URL, then records availability / budget_remaining /
// burn_rate into public.slo_snapshots.
//
// No data (Prometheus down, query returns no series) → availability = 1
// by convention (a missing data point is not a failure).

import { getWorkerDbPool } from '../db.js';
import { promQueryValue } from '../../scripts/lib/prom-client.js';

export default async function sloSnapshot() {
  const pool = getWorkerDbPool();
  const { rows: slos } = await pool.query(
    "SELECT id, metric_query, target, window_days FROM public.slos WHERE is_active"
  );

  let written = 0;
  for (const slo of slos) {
    let availability = 1;
    const v = await promQueryValue(slo.metric_query);
    if (v !== null) availability = v;

    const target = parseFloat(slo.target);
    const oneMinusTarget = Math.max(0.0001, 1 - target);
    const budgetRemaining = Math.max(
      0,
      ((availability - 1 + (1 - target)) / oneMinusTarget) * 100
    );
    const burnRate = (1 - availability) / oneMinusTarget;
    const breaching = availability < target;

    await pool.query(
      `INSERT INTO public.slo_snapshots
         (slo_id, availability, budget_remaining_pct, burn_rate, is_breaching)
       VALUES ($1, $2, $3, $4, $5)`,
      [slo.id, availability, budgetRemaining, burnRate, breaching]
    );
    written += 1;
  }
  return { recordsAffected: written, details: `snapshot for ${written} SLO(s)` };
}
