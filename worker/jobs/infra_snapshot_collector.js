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

  // disk free % — `df -P /` in the container's root filesystem. The Capacity
  // column is the *used* percentage, so free% = 100 - used. Use Available and
  // 1024-blocks to compute it exactly rather than relying on the rounded
  // Capacity column. Works in BusyBox and GNU coreutils alike.
  let diskFreePct = null;
  const dfLine = shell('df -P / 2>/dev/null | tail -1');
  if (dfLine) {
    const cols = dfLine.trim().split(/\s+/);
    // df -P columns: Filesystem 1024-blocks Used Available Capacity Mounted
    const blocks = Number(cols[1]);
    const avail = Number(cols[3]);
    if (blocks > 0) {
      diskFreePct = Math.round((avail / blocks) * 100);
    }
  }

  // backup age in hours — read the host-side backup heartbeat that
  // master-backup.sh publishes to the shared status_data volume (mounted
  // read-write at /usr/share/status). The container cannot see
  // /opt/monitoring/backups directly; this file is the bridge.
  let backupAgeHours = null;
  try {
    const { readFileSync, existsSync } = await import('node:fs');
    const heartbeatPath = process.env.STATUS_LAST_JSON
      ? process.env.STATUS_LAST_JSON.replace(/\/[^/]+$/, '/backup-heartbeat.json')
      : '/usr/share/status/backup-heartbeat.json';
    if (existsSync(heartbeatPath)) {
      const hb = JSON.parse(readFileSync(heartbeatPath, 'utf8'));
      if (hb.at) {
        const ageMs = Date.now() - new Date(hb.at).getTime();
        if (ageMs >= 0) backupAgeHours = Math.round(ageMs / 3600000);
      }
    }
  } catch { /* leave null */ }

  // unhealthy gate_* containers — the worker cannot call docker CLI from
  // inside its container. The host-side auto-heal-watchdog.sh is the real
  // container-health sensor; the worker's snapshot records what it can
  // detect from the DB (a dead DB is visible; a dead container isn't).
  let containerUnhealthy = [];

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
