// Phase 2 PREDICT: rolling-window linear-regression forecaster.
//
// Runs every 5 minutes over the last hour of infra_snapshots. For each
// signal with a monotone, meaningful slope it fits a least-squares line
// and projects to the breach threshold. When the predicted breach time
// is inside the action window, it writes an infra_forecasts row and (for
// auto/notify modes) an operator_actions row so the act phase picks it up.
//
// Simple linear regression is deliberately enough: we are forecasting
// slow resource exhaustion (disk, pool, queue), not transient spikes.

import { getWorkerDbPool } from '../db.js';

// signal -> { threshold, window_minutes, mode }
const SIGNALS = [
  { key: 'disk_free_pct',    threshold: 5,   windowMin: 24*60,  action: 'extend_disk',      higherIsWorse: false },
  { key: 'db_pool_used',     threshold: 0,   windowMin: 30,     action: 'raise_pool_size',  higherIsWorse: true }, // threshold filled from current max
  { key: 'queue_depth',      threshold: 1000,windowMin: 60,     action: 'restart_worker',   higherIsWorse: true },
  { key: 'scan_p95_ms',      threshold: 800, windowMin: 15,     action: 'scale_replicas',   higherIsWorse: true },
  { key: 'error_rate',       threshold: 0.02,windowMin: 10,     action: 'escalation',       higherIsWorse: true },
];

function linreg(points) {
  // points: [{ t: epochSec, v: number }] sorted by t.
  // Returns { slope, intercept } in value-per-second.
  const n = points.length;
  if (n < 2) return null;
  const xs = points.map((p) => p.t);
  const ys = points.map((p) => p.v);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: my - slope * mx };
}

export default async function runInfraForecaster() {
  const pool = getWorkerDbPool();

  // Kill switch (DR §4): if auto_scale_enabled is FALSE, the forecaster still
  // records forecasts (observation is free) but does NOT create operator_actions
  // rows. A human can still read infra_forecasts and act manually.
  const kill = await pool.query(
    `SELECT enabled FROM public.automation_controls WHERE name = 'auto_scale_enabled'`
  ).catch(() => ({ rows: [] }));
  const autoScaleEnabled = kill.rows[0]?.enabled !== false;

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const forecastRows = [];

  for (const sig of SIGNALS) {
    let points = [];
    try {
      const r = await pool.query(
        `SELECT (EXTRACT(EPOCH FROM captured_at))::bigint AS t,
                ${sig.key} AS v
           FROM public.infra_snapshots
          WHERE captured_at >= $1
            AND ${sig.key} IS NOT NULL
          ORDER BY captured_at ASC`,
        [hourAgo.toISOString()]
      );
      points = r.rows.filter((row) => row.v != null).map((row) => ({ t: Number(row.t), v: Number(row.v) }));
    } catch { continue; }
    if (points.length < 6) continue; // not enough samples

    const fit = linreg(points);
    if (!fit || fit.slope === 0) continue;

    // Determine the effective threshold. For db_pool_used the breach is at
    // 95% of the current max_connections.
    let threshold = sig.threshold;
    if (sig.key === 'db_pool_used') {
      const maxR = await pool.query(`SELECT setting::int FROM pg_settings WHERE name='max_connections'`);
      const maxConn = maxR.rows[0]?.setting || 100;
      threshold = Math.floor(maxConn * 0.95);
    }

    const last = points[points.length - 1].v;
    const nowSec = Math.floor(Date.now() / 1000);

    // Direction check: only forecast breaches in the worsening direction.
    const worsening = sig.higherIsWorse ? last > threshold || fit.slope > 0 : last < threshold || fit.slope < 0;
    if (!worsening) continue;

    // Project the time (in seconds) when the fitted line crosses the threshold.
    // value(t) = slope*t + intercept  =>  t_cross = (threshold - intercept)/slope
    if (fit.slope === 0) continue;
    const tCross = (threshold - fit.intercept) / fit.slope;
    const secondsUntilBreach = tCross - nowSec;
    if (secondsUntilBreach < 0 || secondsUntilBreach > sig.windowMin * 60) continue;

    // Confidence: how tight is the fit? Use R^2 as a proxy.
    const my = points.reduce((a, p) => a + p.v, 0) / points.length;
    let ssTot = 0, ssRes = 0;
    for (const p of points) {
      const pred = fit.slope * p.t + fit.intercept;
      ssTot += (p.v - my) ** 2;
      ssRes += (p.v - pred) ** 2;
    }
    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    const confidence = Math.max(0.1, Math.min(0.99, r2));

    const predictedBreachAt = new Date((nowSec + secondsUntilBreach) * 1000).toISOString();
    const evidence = {
      signal: sig.key,
      current: last,
      threshold,
      slope_per_hour: fit.slope * 3600,
      r2,
      samples: points.length,
      seconds_until_breach: Math.round(secondsUntilBreach),
    };

    const fr = await pool.query(
      `INSERT INTO public.infra_forecasts
         (signal, predicted_breach_at, predicted_value, confidence, recommended_action, evidence)
       VALUES ($1, $2::timestamptz, $3, $4, $5, $6::jsonb)
       RETURNING id`,
      [sig.key, predictedBreachAt, threshold, confidence.toFixed(2), sig.action, JSON.stringify(evidence)]
    );

    // Decide auto vs. approve via the policy engine.
    let policy;
    try {
      policy = await pool.query(
        `SELECT execution_mode, min_confidence, cooldown_minutes FROM public.auto_policies WHERE action_kind = $1`,
        [sig.action]
      );
    } catch { policy = { rows: [] }; }
    const mode = policy.rows[0]?.execution_mode ?? 'approve';
    const minConf = Number(policy.rows[0]?.min_confidence ?? 0.8);

    if (autoScaleEnabled && confidence >= minConf && mode !== 'approve') {
      // auto or notify -> create a low-risk operator_actions row (auto-executes
      // after its window if no one rejects).
      const orow = await pool.query(
        `INSERT INTO public.operator_actions
           (kind, title, payload, evidence, risk, approver_role, status, source, auto_run_seconds)
         VALUES ($1, $2, $3, $4, $5, 'sysadmin', 'pending', 'worker', 60)
         RETURNING id`,
        [
          sig.action,
          `Forecast: ${sig.key} reaches ${threshold} in ${Math.round(secondsUntilBreach/60)}m (confidence ${confidence.toFixed(2)})`,
          JSON.stringify({ signal: sig.key, predicted_breach_at: predictedBreachAt, forecast_id: fr.rows[0].id }),
          JSON.stringify(evidence),
          mode === 'auto' ? 'low' : 'low',
        ]
      );
      forecastRows.push({ signal: sig.key, action: sig.action, mode, autoRun: orow.rows[0].id, confidence });
    } else {
      // approve -> create a high-risk row that waits for a human tap.
      const orow = await pool.query(
        `INSERT INTO public.operator_actions
           (kind, title, payload, evidence, risk, approver_role, status, source, auto_run_seconds)
         VALUES ($1, $2, $3, $4, 'high', 'sysadmin', 'pending', 'worker', 0)
         RETURNING id`,
        [
          sig.action,
          `Forecast (needs approval): ${sig.key} reaches ${threshold} in ${Math.round(secondsUntilBreach/60)}m`,
          JSON.stringify({ signal: sig.key, predicted_breach_at: predictedBreachAt, forecast_id: fr.rows[0].id }),
          JSON.stringify(evidence),
        ]
      );
      forecastRows.push({ signal: sig.key, action: sig.action, mode: 'approve', waitForApproval: orow.rows[0].id, confidence });
    }
  }

  if (forecastRows.length) {
    console.log(`[forecaster] ${forecastRows.length} forecast(s) acted on:`, JSON.stringify(forecastRows));
  }
  return forecastRows;
}
