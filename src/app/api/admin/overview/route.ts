// src/app/api/admin/overview/route.ts
// Sysadmin Overview aggregator: Postgres-aggregated OverviewPayload consumed by
// the new sidebar + Command Center.
//
// All reads run against the server-side Postgres pool (`query` from @/lib/postgres),
// NOT Supabase. Every table/column name below was confirmed against existing
// api/admin routes:
//   - users.status  -> 'ACTIVE' | 'SUSPENDED' | 'DEPROVISIONED'
//   - users.two_factor_enabled (boolean)
//   - gates.is_active (boolean)
//   - alerts.severity ('critical'|'high'|'medium'|'low') + alerts.resolved (boolean)
//   - role_change_requests.status ('PENDING' | 'APPROVED' | 'REJECTED')
//   - permissions.status ('PENDING' ...)  [permissions / permission_requests]
//   - backups.created_at (timestamp)
//   - audit_logs.timestamp (timestamp)
//   - departments / classes (counts)
//
// admin-scoped: requiredRole ['sysadmin','admin'].

import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

/** First positional row value, coerced to a number. 0 when the query returned
 *  no rows (e.g. a table is missing / empty). Keeps the aggregator resilient to
 *  schema drift at runtime. */
function num(rows: Array<Record<string, unknown>>): number {
  const v = rows[0]?.count;
  return typeof v === "number" ? v : 0;
}

export const GET = withRateLimit(
  withAuthorization(
    async (req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> => {
      void req;
      void ctx;

      // ------------------------------------------------------------------
      // Service health checks (best-effort).
      // ------------------------------------------------------------------
      let serviceHealth = ["ok", "ok", "ok", "ok", "ok"];
      try {
        const { checkSystemHealth } = await import("@/lib/health");
        const health = await checkSystemHealth();
        const components = health.components;
        const dbOk = components.database?.status === "healthy";
        const redisOk = !components.redis || components.redis.status === "healthy";
        const servicesOk =
          components.services?.status === "healthy" &&
          (components.services as Record<string, { status?: string }> | undefined)
            ?.auth?.status !== "unhealthy";
        const envOk = !components.env || components.env.status === "healthy";
        const webOk = dbOk && servicesOk;
        const caddyOk = envOk; // proxy: if env/config ready, reverse proxy assumed up
        const workerOk = redisOk; // proxy: worker is healthy when redis is healthy
        serviceHealth = [caddyOk, webOk, dbOk, redisOk, workerOk].map(
          (ok) => (ok ? "ok" : "error")
        );
      } catch {
        // health engine unavailable — leave the nominal stub
      }

      // ------------------------------------------------------------------
      // All reads fire in a single Promise.all.
      // ------------------------------------------------------------------
      const [
        identityRows,
        mfaRows,
        gatesRows,
        alertsRows,
        backupRows,
        deptRows,
        classRows,
        auditRows,
        roleReqRows,
        permRows,
      ] = await Promise.all([
        // users by status (ACTIVE / SUSPENDED / DEPROVISIONED-or-deleted).
        query(`
          SELECT
            COUNT(*) FILTER (WHERE status = 'ACTIVE')        AS active,
            COUNT(*) FILTER (WHERE status = 'SUSPENDED')     AS suspended,
            COUNT(*) FILTER (WHERE status = 'DEPROVISIONED') AS deprovisioned
          FROM users
        `).then((r) => r.rows),

        // MFA coverage removed — MFA subsystem has been removed from the
        // architecture. Return a constant 0 so existing consumers don't
        // break.
        Promise.resolve([{ mfa_coverage: 0 }]),

        // gates is_active -> online/offline per gate.
        query(`
          SELECT is_active FROM gates ORDER BY id
        `).then((r) => r.rows),

        // open (resolved = false) alerts by severity.
        query(`
          SELECT
            COUNT(*) FILTER (WHERE severity = 'critical') AS critical,
            COUNT(*) FILTER (WHERE severity = 'high')     AS high,
            COUNT(*) FILTER (WHERE severity = 'medium')    AS medium,
            COUNT(*) FILTER (WHERE severity = 'low')       AS low
          FROM alerts
          WHERE resolved = false
        `).then((r) => r.rows),

        // backup freshness: recency of MAX(created_at) (0..1). None -> 0.
        query(`
          SELECT
            GREATEST(
              0,
              LEAST(
                1,
                (EXTRACT(EPOCH FROM (NOW() - MAX(created_at)))::numeric / (3 * 24 * 3600))::real
              )
            ) AS backup_freshness
          FROM backups
        `).then((r) => r.rows),

        // reference counts: departments.
        query(`SELECT COUNT(*) AS count FROM departments`).then((r) => r.rows),

        // reference counts: classes (courses) + sections.
        query(`
          SELECT
            COUNT(*) AS courses,
            COUNT(DISTINCT section) AS sections
          FROM classes
        `).then((r) => r.rows),

        // governance: audit events per day, last 7 days (oldest first).
        query(`
          SELECT
            d.day::text AS day,
            COUNT(a.id) AS cnt
          FROM generate_series(
                  NOW() - INTERVAL '6 days', NOW(), INTERVAL '1 day'
                ) AS d(day)
          LEFT JOIN audit_logs a
            ON date_trunc('day', a.timestamp) = date_trunc('day', d.day)
          GROUP BY d.day
          ORDER BY d.day
        `).then((r) => r.rows),

        // sidebar badge: pending role-change requests.
        query(
          `SELECT COUNT(*) AS count FROM role_change_requests WHERE status = 'PENDING'`
        ).then((r) => r.rows),

        // sidebar badge: pending permission/access requests.
        query(`
          SELECT COUNT(*) AS count FROM permissions WHERE status = 'PENDING'
        `).then((r) => r.rows),
      ]);

      // ------------------------------------------------------------------
      // Assemble the OverviewPayload.
      // ------------------------------------------------------------------
      const identity = {
        active: Number(identityRows[0]?.active ?? 0),
        suspended: Number(identityRows[0]?.suspended ?? 0),
        deprovisioned: Number(identityRows[0]?.deprovisioned ?? 0),
      };

      const mfaRaw = mfaRows[0]?.mfa_coverage;
      const mfaCoverage =
        typeof mfaRaw === "number"
          ? mfaRaw
          : typeof mfaRaw === "string"
            ? Number(mfaRaw) || 0
            : 0;

      // gates: map is_active to online/offline.
      const gateStatus: ("online" | "offline")[] = gatesRows.map((row) =>
        row.is_active === true || row.is_active === "true" ? "online" : "offline"
      );

      const aRow = alertsRows[0] ?? {};
      const alerts = {
        critical: Number(aRow.critical ?? 0),
        high: Number(aRow.high ?? 0),
        medium: Number(aRow.medium ?? 0),
        low: Number(aRow.low ?? 0),
      };

      const backupRaw = backupRows[0]?.backup_freshness;
      const backupFreshness =
        typeof backupRaw === "number"
          ? Math.max(0, Math.min(1, backupRaw))
          : typeof backupRaw === "string"
            ? Math.max(0, Math.min(1, Number(backupRaw) || 0))
            : 0;

      const reference = {
        departments: num(deptRows),
        courses: Number(classRows[0]?.courses ?? 0),
        sections: Number(classRows[0]?.sections ?? 0),
      };

      // governance.events7d: one count per day, oldest -> newest.
      const events7d: number[] = auditRows.map((row) => Number(row.cnt ?? 0));

      // Sidebar badge counts.
      const counts = {
        people: identity.active,
        promotions: num(roleReqRows),
        access: num(permRows),
      };

      const payload = {
        // command: 5 service checks — caddy, web, postgres, redis, worker.
        // Real status via checkSystemHealth when reachable; nominal otherwise.
        command: { health: serviceHealth },

        identity,

        access: { mfaCoverage },

        gates: { status: gateStatus },

        // monitoring.errorRate24h — stub. NOTE: compute real per-hour error
        // rate from a metrics table (e.g. api_metrics) later.
        monitoring: { errorRate24h: Array(24).fill(0) },

        alerts,

        // automation.runs14d — stub. NOTE: source real daily job-run counts
        // from the jobs/scheduler table later.
        automation: { runs14d: Array(14).fill(1) },

        data: { backupFreshness },

        reference,

        // platform: env/schema drift — stub 0,0. NOTE: derive from
        // environment diff + schema_migrations later.
        platform: { envDrift: 0, schemaDrift: 0 },

        governance: { events7d },

        counts,
      };

      return ok(payload);
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60_000, maxRequests: 120 }
);
