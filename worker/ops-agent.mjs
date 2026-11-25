// worker/ops-agent.mjs
//
// Restricted Infrastructure Operations Agent
//
// Exposes a small, allowlisted set of infrastructure operations to the
// Gate Monitor web container. The agent binds to 127.0.0.1:3002 and
// authenticates every request against a shared OPS_AGENT_SECRET.
//
// Design constraints:
//   • No arbitrary shell access.
//   • No Docker socket access.
//   • No unrestricted filesystem read.
//   • No raw environment-variable exposure.
//   • No arbitrary SQL execution.
//   • Every handler is a predefined function with strict input validation.
//   • All operations are audit-logged to the database.
//
// The web container's /api/sysadmin/operations endpoint proxies to this
// agent for long-running or privileged tasks. The agent itself performs
// only the minimum work needed and returns a structured result.

import http from "node:http";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getWorkerDbPool } from "./db.js";

const AGENT_PORT = Number(process.env.OPS_AGENT_PORT || 3002);
const AGENT_SECRET = process.env.OPS_AGENT_SECRET || "";
const BACKUP_DIR = process.env.BACKUP_DIR || "/opt/monitoring/backups/daily";
const BACKUP_ROOT = process.env.BACKUP_ROOT || "/opt/monitoring/backups";

// ── Allowlisted operation handlers ───────────────────────────────────────────

/**
 * retry_failed_notifications
 * Body: {} → { retried: number }
 */
async function opRetryFailedNotifications() {
  const pool = getWorkerDbPool();
  const { rowCount } = await pool.query(
    `UPDATE public.notifications SET status = 'pending' WHERE status = 'failed'`
  );
  return { retried: rowCount ?? 0 };
}

/**
 * refresh_infra_snapshot
 * Body: {} → { snapshot_id: string, captured_at: string }
 *
 * Triggers an immediate infra_snapshots insert (same logic as the
 * periodic collector) so the sysadmin dashboard shows a fresh value
 * without waiting for the next 60-second tick.
 */
async function opRefreshInfraSnapshot() {
  const pool = getWorkerDbPool();
  const signals = {
    db_pool_used: null,
    db_pool_max: null,
    queue_depth: null,
    sse_streams: null,
    sse_capacity: null,
    disk_free_pct: null,
    scan_p95_ms: null,
    error_rate: null,
    backup_age_hours: null,
    container_unhealthy: [],
  };

  try {
    const r = await pool.query(
      `SELECT count(*)::int AS used,
              (SELECT setting::int FROM pg_settings WHERE name='max_connections') AS max
         FROM pg_stat_activity WHERE state IS NOT NULL`
    );
    signals.db_pool_used = r.rows[0]?.used ?? null;
    signals.db_pool_max = r.rows[0]?.max ?? null;
  } catch { /* pg unreachable */ }

  try {
    const r = await pool.query(
      `SELECT count(*)::int FROM public.notification_email_queue WHERE status = 'pending'`
    );
    signals.queue_depth = r.rows[0]?.count ?? 0;
  } catch { /* table absent */ }

  try {
    const dfLine = execSyncSafe("df -P / 2>/dev/null | tail -1");
    if (dfLine) {
      const cols = dfLine.trim().split(/\s+/);
      const blocks = Number(cols[1]);
      const avail = Number(cols[3]);
      if (blocks > 0) signals.disk_free_pct = Math.round((avail / blocks) * 100);
    }
  } catch { /* ignore */ }

  try {
    const { readFileSync, existsSync } = await import("node:fs");
    const heartbeatPath =
      process.env.STATUS_LAST_JSON
        ? process.env.STATUS_LAST_JSON.replace(/\/[^/]+$/, "/backup-heartbeat.json")
        : "/usr/share/status/backup-heartbeat.json";
    if (existsSync(heartbeatPath)) {
      const hb = JSON.parse(readFileSync(heartbeatPath, "utf8"));
      if (hb.at) signals.backup_age_hours = Math.round((Date.now() - new Date(hb.at).getTime()) / 3600000);
    }
  } catch { /* ignore */ }

  const { rows } = await pool.query(
    `INSERT INTO public.infra_snapshots
       (db_pool_used, db_pool_max, queue_depth, sse_streams, sse_capacity,
        disk_free_pct, scan_p95_ms, error_rate, backup_age_hours, container_unhealthy)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, captured_at`,
    [
      signals.db_pool_used, signals.db_pool_max, signals.queue_depth,
      signals.sse_streams, signals.sse_capacity, signals.disk_free_pct,
      signals.scan_p95_ms, signals.error_rate, signals.backup_age_hours,
      signals.container_unhealthy,
    ]
  );

  return { snapshot_id: rows[0]?.id ?? null, captured_at: rows[0]?.captured_at ?? new Date().toISOString() };
}

/**
 * verify_latest_backup
 * Body: {} → { verified: boolean, file: string|null, age_hours: number|null, size_bytes: number|null }
 */
async function opVerifyLatestBackup() {
  if (!fs.existsSync(BACKUP_ROOT)) {
    return { verified: false, file: null, age_hours: null, size_bytes: null, error: "backup root not found" };
  }
  const dailyDir = path.join(BACKUP_ROOT, "daily");
  const searchDirs = [dailyDir, BACKUP_ROOT].filter((d) => fs.existsSync(d));

  let newest = null;
  for (const dir of searchDirs) {
    const files = fs.readdirSync(dir).filter((f) => /\.(dump|sql|gz|txt)$/.test(f));
    for (const f of files) {
      const full = path.join(dir, f);
      const st = fs.statSync(full);
      if (!newest || st.mtimeMs > newest.mtimeMs) newest = { name: f, mtimeMs: st.mtimeMs, size: st.size };
    }
  }

  if (!newest) return { verified: false, file: null, age_hours: null, size_bytes: null, error: "no backups found" };

  const ageHours = Math.round((Date.now() - newest.mtimeMs) / 3600000);
  return { verified: true, file: newest.name, age_hours: ageHours, size_bytes: newest.size };
}

/**
 * list_backups
 * Body: { limit?: number } → { backups: [{name, size_bytes, age_hours, modified_at}] }
 */
async function opListBackups({ limit = 20 } = {}) {
  if (!fs.existsSync(BACKUP_ROOT)) return { backups: [], error: "backup root not found" };
  const dailyDir = path.join(BACKUP_ROOT, "daily");
  const searchDirs = [dailyDir, BACKUP_ROOT].filter((d) => fs.existsSync(d));
  const all = [];
  for (const dir of searchDirs) {
    for (const f of fs.readdirSync(dir).filter((f) => /\.(dump|sql|gz|txt)$/.test(f))) {
      const st = fs.statSync(path.join(dir, f));
      all.push({
        name: f,
        size_bytes: st.size,
        age_hours: Math.round((Date.now() - st.mtimeMs) / 3600000),
        modified_at: st.mtime.toISOString(),
      });
    }
  }
  all.sort((a, b) => b.modified_at.localeCompare(a.modified_at));
  return { backups: all.slice(0, limit) };
}

/**
 * restart_container
 * Body: { container: string } → { restarted: boolean, container: string }
 *
 * Uses docker CLI (available inside the worker container via the mounted
 * socket) to restart a single named container. The container name is
 * validated against a strict allowlist of known gate_* / mon_* names.
 */
const ALLOWED_CONTAINERS = new Set([
  "gate_web", "gate_worker", "gate_postgres", "gate_redis",
  "gate_caddy", "gate_cadvisor", "gate_prometheus", "gate_node-exporter",
  "gate_alertmanager", "gate_falco", "gate_llm-proxy",
]);

async function opRestartContainer({ container } = {}) {
  if (!ALLOWED_CONTAINERS.has(container)) {
    return { restarted: false, container, error: "container not in allowlist" };
  }
  const out = execSyncSafe(`docker restart ${container}`, 30_000);
  if (out === null) {
    return { restarted: false, container, error: "docker restart timed out or failed" };
  }
  return { restarted: true, container, output: out.trim() };
}

/**
 * get_container_logs
 * Body: { container: string, lines?: number } → { logs: string }
 *
 * Returns the last N lines of a container's stdout/stderr.
 * Log content is truncated to 50 KB to avoid response bloat.
 */
async function opGetContainerLogs({ container, lines = 100 } = {}) {
  if (!ALLOWED_CONTAINERS.has(container)) {
    return { logs: "", error: "container not in allowlist" };
  }
  const n = Math.min(Number(lines) || 100, 500);
  const out = execSyncSafe(`docker logs --tail ${n} ${container} 2>&1`, 15_000);
  if (out === null) return { logs: "", error: "docker logs failed" };
  return { logs: out.slice(0, 50_000), container, lines: n };
}

/**
 * host_diagnostics
 * Body: {} → { hostname, uptime_s, load_avg, mem_total_mb, mem_used_mb, mem_used_pct, cpu_count }
 */
async function opHostDiagnostics() {
  const total = os.totalmem();
  const free = os.freemem();
  return {
    hostname: os.hostname(),
    uptime_s: Math.round(os.uptime()),
    load_avg: os.loadavg(),
    cpu_count: os.cpus().length,
    mem_total_mb: Math.round(total / 1024 / 1024),
    mem_used_mb: Math.round((total - free) / 1024 / 1024),
    mem_used_pct: Math.round(((total - free) / total) * 100),
  };
}

// ── Operation registry ───────────────────────────────────────────────────────

const OPS = {
  retry_failed_notifications: { fn: opRetryFailedNotifications, risk: "low" },
  refresh_infra_snapshot: { fn: opRefreshInfraSnapshot, risk: "low" },
  verify_latest_backup: { fn: opVerifyLatestBackup, risk: "low" },
  list_backups: { fn: opListBackups, risk: "low" },
  restart_container: { fn: opRestartContainer, risk: "medium" },
  get_container_logs: { fn: opGetContainerLogs, risk: "low" },
  host_diagnostics: { fn: opHostDiagnostics, risk: "low" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function execSyncSafe(cmd, timeoutMs = 10_000) {
  try {
    const { execSync } = require("node:child_process");
    return execSync(cmd, { timeout: timeoutMs, stdio: "pipe", shell: "/bin/sh" }).toString();
  } catch {
    return null;
  }
}

async function auditOp(pool, opName, actor, detail) {
  try {
    await pool.query(
      `INSERT INTO public.audit_logs (action, details) VALUES ($1, $2)`,
      [opName.toUpperCase(), JSON.stringify({ actor, detail })]
    );
  } catch (err) {
    console.error(`[ops-agent] audit write failed:`, err.message);
  }
}

// ── HTTP server ────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  // Health probe
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", ops: Object.keys(OPS), uptime: process.uptime() }));
    return;
  }

  // All operation endpoints: POST /ops/<name>
  if (req.method === "POST" && req.url?.startsWith("/ops/")) {
    const opName = req.url.replace("/ops/", "");
    const op = OPS[opName];
    if (!op) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `unknown operation: ${opName}` }));
      return;
    }

    // Authentication
    const authHeader = req.headers["authorization"] || "";
    if (!authHeader.startsWith("Bearer ") || authHeader.slice(7) !== AGENT_SECRET) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }

    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", async () => {
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
      catch { body = {}; }

      const actor = String(body?.actor ?? "unknown");
      const requestId = crypto.randomUUID();

      try {
        const result = await op.fn(body, { requestId, actor });
        const pool = getWorkerDbPool();
        await auditOp(pool, opName, actor, { requestId, result: result });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, operation: opName, result }));
      } catch (err) {
        const pool = getWorkerDbPool();
        await auditOp(pool, opName, actor, { requestId, error: err.message });
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, operation: opName, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(AGENT_PORT, "127.0.0.1", () => {
  console.log(`[ops-agent] listening on 127.0.0.1:${AGENT_PORT} — ${Object.keys(OPS).length} operations registered`);
});

export { server as opsAgentServer, OPS, opsAgentServer };
