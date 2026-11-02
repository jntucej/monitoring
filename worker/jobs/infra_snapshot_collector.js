// Phase 1 OBSERVE: collect unified infra health every 60s.
//
// Writes one infra_snapshots row per interval. The predictor (Phase 2)
// and the sysadmin dashboard (Phase 7) both read this table — it is the
// single source of truth for the autonomous SRE loop.
//
// Signals collected:
//   db_pool_used/max   — pg_stat_activity count for this replica vs. max
//   queue_depth        — notification_email_queue pending count
//   sse_streams/capacity — in-process count; the web container exposes it
//                          via the /api/sysadmin/health SSE snapshot when
//                          available, otherwise null
//   disk_free_pct      — df on the backup volume (host-side)
//   scan_p95_ms        — api_metrics p95 over the last 5 min
//   error_rate         — 5xx / total in api_metrics over the last 5 min
//   backup_age_hours   — newest gate-db-*.sql.gz mtime
//   container_unhealthy — names of gate_* containers currently unhealthy

import { getWorkerDbPool } from '../db.js';
import { execSync } from 'node:child_process';

function shell(cmd) {
  try {
    return execSync(cmd, { timeout: 5000, stdio: 'pipe' }).toString().trim();
  } catch {
    return null;
  }
}

export default async function collectInfraSnapshot() {
  const pool = getWorkerDbPool();

  // db pool: pg_stat_activity count for this process's connection vs. max.
  let dbPoolUsed = null;
  let dbPoolMax = null;
  try {
    const r = await pool.query(
      `SELECT count(*)::int AS used, (SELECT setting::int FROM pg_settings WHERE name='max_connections') AS max
         FROM pg_stat_activity WHERE state IS NOT NULL`
    );
    dbPoolUsed = r.rows[0]?.used ?? null;
    dbPoolMax = r.rows[0]?.max ?? null;
  } catch { /* pg unreachable — leave null */ }

  // queue depth
  let queueDepth = null;
  try {
    const r = await pool.query(
      `SELECT count(*)::int FROM public.notification_email_queue WHERE status = 'pending'`
    );
    queueDepth = r.rows[0]?.count ?? 0;
  } catch { /* table may not exist in dev */ }

  // scan p95 + error rate from api_metrics (last 5 min)
  let scanP95Ms = null;
  let errorRate = null;
  try {
    const r = await pool.query(
      `SELECT
         PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95,
         SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END)::numeric / NULLIF(SUM(1), 0) AS err_rate
       FROM public.api_metrics
       WHERE captured_at > NOW() - INTERVAL '5 minutes'`
    );
    if (r.rows[0]) {
      scanP95Ms = r.rows[0].p95 != null ? Math.round(Number(r.rows[0].p95)) : null;
      errorRate = r.rows[0].err_rate != null ? Number(r.rows[0].err_rate) : null;
    }
  } catch { /* no api_metrics — leave null */ }

  // disk free % on the backup volume
  let diskFreePct = null;
  const dfOut = shell('df --output=pcent /opt/monitoring/backups 2>/dev/null | tail -1 | tr -d \" %\"');
  if (dfOut && dfOut !== '0') diskFreePct = Number(dfOut);

  // backup age in hours
  let backupAgeHours = null;
  const newest = shell(
    'newest=$(find /opt/monitoring/backups -name "gate-db-*.sql.gz" -printf "%T@\n" 2>/dev/null | sort -n | tail -1); ' +
    '[ -n "$newest" ] && echo $(( ( $(date +%s) - ${newest%%.*} ) / 3600 ))'
  );
  if (newest !== null && newest !== '') backupAgeHours = Number(newest);

  // unhealthy gate_* containers
  let containerUnhealthy = [];
  const unhealthy = shell(
    'for c in gate_postgres gate_redis gate_web gate_worker gate_caddy; do ' +
    '  st=$(docker inspect --format \'{{.State.Health.Status}}\' "$c" 2>/dev/null || echo missing); ' +
    '  [ "$st" = "unhealthy" ] && echo "$c"; ' +
    'done'
  );
  if (unhealthy && unhealthy.trim()) containerUnhealthy = unhealthy.trim().split('\n').filter(Boolean);

  // SSE streams: not reachable from the worker (in-process web counter);
  // the web container's /api/sysadmin/health exposes it when polled.
  const sseStreams = null;
  const sseCapacity = null;

  await pool.query(
    `INSERT INTO public.infra_snapshots
       (db_pool_used, db_pool_max, queue_depth, sse_streams, sse_capacity,
        disk_free_pct, scan_p95_ms, error_rate, backup_age_hours, container_unhealthy)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [dbPoolUsed, dbPoolMax, queueDepth, sseStreams, sseCapacity,
     diskFreePct, scanP95Ms, errorRate, backupAgeHours, containerUnhealthy]
  );

  // DR §7: write a last-known-good snapshot JSON so Caddy's static /status
  // page can render it when the web container is down. The Caddy container
  // reads /usr/share/status/status-last.json (mounted from status_data).
  try {
    const { writeFileSync } = await import('node:fs');
    const statusLastPath = process.env.STATUS_LAST_JSON || '/usr/share/status/status-last.json';
    writeFileSync(statusLastPath, JSON.stringify({
      capturedAt: new Date().toISOString(),
      dbPoolUsed,
      dbPoolMax,
      queueDepth,
      diskFreePct,
      scanP95Ms,
      errorRate,
      unhealthyContainers: containerUnhealthy,
    }));
  } catch {
    // The Caddy fallback is best-effort; never crash the snapshot job
    // because the status file couldn't be written.
  }
}
