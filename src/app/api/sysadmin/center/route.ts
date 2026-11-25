import os from "os";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import {
  hasSystemPermission,
  isAllowlistedAction,
  redactSensitiveFields,
} from "@/lib/sysadmin/permissions";

const BACKUP_DIR = "/opt/monitoring/backups/daily";

async function probeUrl(url: string): Promise<{ ok: boolean; status: number | null; latency_ms: number }> {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return { ok: r.ok, status: r.status, latency_ms: Date.now() - t0 };
  } catch {
    return { ok: false, status: null, latency_ms: Date.now() - t0 };
  }
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!hasSystemPermission(auth.role, "system.infrastructure.read")) {
    return fail("FORBIDDEN", "System administration permission required", 403);
  }

  const severity = req.nextUrl.searchParams.get("severity");

  const [
    pgStats,
    pgSize,
    pgLocks,
    topTables,
    jobs,
    auditLogs,
    secAlerts,
    failedLogins,
    deployments,
    promProbe,
  ] = await Promise.all([
    query<{ total: number; active: number; idle: number }>(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE state = 'active')::int AS active,
              COUNT(*) FILTER (WHERE state = 'idle')::int AS idle
         FROM pg_stat_activity WHERE datname = current_database()`,
    ).catch(() => ({ rows: [{ total: 0, active: 0, idle: 0 }] })),
    query<{ bytes: string }>(`SELECT pg_database_size(current_database())::text AS bytes`).catch(() => ({
      rows: [{ bytes: "0" }],
    })),
    query<{ cnt: number }>(`SELECT COUNT(*)::int AS cnt FROM pg_locks`).catch(() => ({ rows: [{ cnt: 0 }] })),
    query<{ relname: string; n_live_tup: string }>(
      `SELECT relname, n_live_tup::text FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 6`,
    ).catch(() => ({ rows: [] })),
    query(`SELECT job_name, last_run_at, last_status, last_duration_ms FROM public.scheduled_jobs ORDER BY job_name ASC`).catch(
      () => ({ rows: [] }),
    ),
    query(
      `SELECT id, action, user_id, role, details, created_at
         FROM public.audit_events
        ORDER BY created_at DESC LIMIT 30`,
    ).catch(() => ({ rows: [] })),
    query(
      `SELECT id, alert_type, severity, status, message, created_at
         FROM public.security_alerts
        WHERE ($1::text IS NULL OR severity = $1)
        ORDER BY created_at DESC LIMIT 25`,
      [severity],
    ).catch(() => ({ rows: [] })),
    query<{ cnt: number }>(
      `SELECT COUNT(*)::int AS cnt FROM public.audit_events
        WHERE action ILIKE '%LOGIN_FAILED%' AND created_at >= NOW() - INTERVAL '24 hours'`,
    ).catch(() => ({ rows: [{ cnt: 0 }] })),
    query(`SELECT * FROM public.deployments ORDER BY created_at DESC LIMIT 10`).catch(() => ({ rows: [] })),
    probeUrl("http://prometheus:9090/-/healthy"),
  ]);

  let backups: { name: string; size_bytes: number; modified_at: string; age_hours: number }[] = [];
  try {
    if (fs.existsSync(BACKUP_DIR)) {
      backups = fs
        .readdirSync(BACKUP_DIR)
        .filter((f) => f.endsWith(".dump") || f.endsWith(".sql") || f.endsWith(".gz") || f.endsWith(".txt"))
        .map((f) => {
          const st = fs.statSync(path.join(BACKUP_DIR, f));
          return {
            name: f,
            size_bytes: st.size,
            modified_at: st.mtime.toISOString(),
            age_hours: Math.round((Date.now() - st.mtimeMs) / 3600000),
          };
        })
        .sort((a, b) => b.modified_at.localeCompare(a.modified_at))
        .slice(0, 15);
    }
  } catch {
    backups = [];
  }

  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  return ok({
    collected_at: new Date().toISOString(),
    infrastructure: {
      hostname: os.hostname(),
      uptime_seconds: Math.round(os.uptime()),
      load_avg: os.loadavg(),
      cpu_count: os.cpus().length,
      memory_total_bytes: totalMem,
      memory_used_bytes: totalMem - freeMem,
      memory_used_pct: Math.round(((totalMem - freeMem) / totalMem) * 100),
    },
    database: {
      available: true,
      connections: pgStats.rows[0],
      size_bytes: Number(pgSize.rows[0]?.bytes ?? 0),
      locks_count: pgLocks.rows[0]?.cnt ?? 0,
      top_tables: topTables.rows,
    },
    backups,
    workers: {
      scheduled_jobs: jobs.rows,
    },
    logs: {
      audit_events: redactSensitiveFields(auditLogs.rows),
      security_alerts: redactSensitiveFields(secAlerts.rows),
    },
    security: {
      failed_logins_24h: failedLogins.rows[0]?.cnt ?? 0,
      open_alerts: secAlerts.rows.filter((a: { status?: string }) => a.status !== "resolved").length,
    },
    deployments: deployments.rows,
    monitoring: {
      prometheus: promProbe,
      grafana_url: "http://100.122.7.62:3001",
    },
  });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  if (!hasSystemPermission(auth.role, "system.workers.retry")) {
    return fail("FORBIDDEN", "System administration action permission required", 403);
  }

  const b = await req.json().catch(() => null);
  const action = String(b?.action ?? "").trim();
  if (!isAllowlistedAction(action)) {
    return fail("INVALID_ACTION", "Action is not in the sysadmin allowlist", 400);
  }

  let result: Record<string, unknown> = {};
  if (action === "retry_failed_notifications") {
    const { rowCount } = await query(
      `UPDATE public.notifications SET status = 'pending' WHERE status = 'failed'`,
    ).catch(() => ({ rowCount: 0 }));
    result = { retried_notifications: rowCount ?? 0 };
  } else if (action === "verify_latest_backup") {
    const exists = fs.existsSync(BACKUP_DIR) && fs.readdirSync(BACKUP_DIR).length > 0;
    result = { backup_dir_present: exists };
  } else {
    result = { refreshed_at: new Date().toISOString() };
  }

  await addAudit({
    action: `SYSADMIN_${action.toUpperCase()}`,
    userId: auth.userId,
    role: auth.role,
    details: result,
  });

  return ok({ action, result });
}

export const GET = withAuthorization(handleGet, { requiredRole: ["sysadmin"] });
export const POST = withAuthorization(handlePost, { requiredRole: ["sysadmin"] });
