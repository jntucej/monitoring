// worker/ops-agent.mjs
//
// Restricted Infrastructure Operations Agent
//
// Exposes a small, allowlisted set of infrastructure operations to the
// Gate Monitor web container. The agent binds to 0.0.0.0:3002 inside the
// worker container (Docker-internal only — port 3002 is NOT published to
// the host) and authenticates every request against a shared
// OPS_AGENT_SECRET.
//
// Design constraints:
//   • No arbitrary shell access.
//   • No Docker socket access (the worker cannot read the socket).
//   • No unrestricted filesystem read.
//   • No raw environment-variable exposure.
//   • No arbitrary SQL execution.
//   • Every handler is a predefined function with strict input validation.
//   • All operations are audit-logged to the database.
//   • Docker operations (restart_container, get_container_logs) are
//     registered but return OPERATION_UNAVAILABLE — the worker image does
//     not contain the docker CLI and cannot read the socket. See
//     docs/future-docker-broker.md for the planned design.
//
// The web container's /api/sysadmin/operations endpoint proxies to this
// agent for long-running or privileged tasks. The agent itself performs
// only the minimum work needed and returns a structured result.

import http from "node:http";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
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
    const dfOut = execFileSyncSafe(["df", "-P", "/"], 5_000);
    if (dfOut) {
      // df -P output: header line + data line
      const lines = dfOut.trim().split("\n");
      if (lines.length >= 2) {
        const cols = lines[1].trim().split(/\s+/);
        // cols: Filesystem 1024-blocks Used Available Capacity Mounted-on
        const blocks = Number(cols[1]);
        const avail = Number(cols[3]);
        if (blocks > 0) signals.disk_free_pct = Math.round((avail / blocks) * 100);
      }
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
 * Body: { container: string } → { available: false, reason: string }
 *
 * NOT FUNCTIONAL: the worker image does not contain the docker CLI and
 * the nextjs user cannot read /var/run/docker.sock (root:docker owned,
 * mode srw-rw----, no group membership). This handler is registered so
 * the UI can show the capability as "planned" but always returns
 * OPERATION_UNAVAILABLE. See docs/future-docker-broker.md.
 */
const ALLOWED_CONTAINERS = new Set([
  "gate_web", "gate_worker", "gate_postgres", "gate_redis",
  "gate_caddy", "gate_cadvisor", "gate_prometheus", "gate_node-exporter",
  "gate_alertmanager", "gate_falco", "gate_llm-proxy",
]);

async function opRestartContainer({ container } = {}) {
  if (!ALLOWED_CONTAINERS.has(container)) {
    return { available: false, container, reason: "container not in allowlist" };
  }
  return {
    available: false,
    container,
    reason: "OPERATION_UNAVAILABLE: docker CLI not installed in worker image and Docker socket is not readable by the nextjs user. See docs/future-docker-broker.md for the planned restricted broker design.",
  };
}

/**
 * get_container_logs
 * Body: { container: string, lines?: number } → { available: false, reason: string }
 *
 * NOT FUNCTIONAL: same constraint as restart_container.
 */
async function opGetContainerLogs({ container, lines = 100 } = {}) {
  if (!ALLOWED_CONTAINERS.has(container)) {
    return { available: false, container, reason: "container not in allowlist" };
  }
  const n = Math.min(Number(lines) || 100, 500);
  return {
    available: false,
    container,
    lines: n,
    reason: "OPERATION_UNAVAILABLE: docker CLI not installed in worker image and Docker socket is not readable by the nextjs user. See docs/future-docker-broker.md for the planned restricted broker design.",
  };
}

/**
 * host_diagnostics
 * Body: { type?: "usb-discover" } →
 *   default: { hostname, uptime_s, load_avg, cpu_count, mem_total_mb, mem_used_mb, mem_used_pct }
 *   usb-discover: { usb_devices: [...] } (from /opt/monitoring/scripts/usb-discover.sh)
 */
async function opHostDiagnostics(body, ctx) {
  // USB discovery sub-operation
  if (body?.type === "usb-discover") {
    const script = "/opt/monitoring/scripts/usb-discover.sh";
    if (!fs.existsSync(script)) {
      return { usb_devices: [], error: "usb-discover.sh not found on host" };
    }
    try {
      const out = execFileSync(script, [], {
        timeout: 30_000,
        stdio: "pipe",
        maxBuffer: 1024 * 1024,
      }).toString();
      const devices = JSON.parse(out);
      return { usb_devices: devices };
    } catch (err) {
      return { usb_devices: [], error: String(err.message).slice(0, 200) };
    }
  }

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

function execFileSyncSafe(args, timeoutMs = 10_000) {
  try {
    const { execFileSync } = require("node:child_process");
    return execFileSync(args[0], args.slice(1), {
      timeout: timeoutMs,
      stdio: "pipe",
    }).toString();
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

server.listen(AGENT_PORT, "0.0.0.0", () => {
  console.log(`[ops-agent] listening on 0.0.0.0:${AGENT_PORT} — ${Object.keys(OPS).length} operations registered (Docker-internal only, port not published to host)`);
});

export { server as opsAgentServer, OPS };
