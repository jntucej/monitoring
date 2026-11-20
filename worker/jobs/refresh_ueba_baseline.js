/**
 * refresh_ueba_baseline.js — hourly REFRESH of the UEBA materialized view.
 *
 * v_user_baseline is a MATERIALIZED VIEW (20261231000011_ueba_baselines.sql).
 * Postgres never auto-refreshes materialized views; without this job the
 * anomaly detection in v_ueba_volume_spikes compares today against the day
 * of creation. The admin /api/admin/ueba route also refreshes on demand,
 * but that only runs when a human opens the dashboard — this job keeps the
 * baseline warm independently.
 */
import { query } from '../db.js';

export default async function refreshUebaBaseline() {
  if (!process.env.REFRESH_UEBA_BASELINE_ENABLED) return;

  const t0 = Date.now();
  await query('REFRESH MATERIALIZED VIEW CONCURRENTLY public.v_user_baseline');
  console.log(`[worker] refresh_ueba_baseline done in ${Date.now() - t0}ms`);
}
