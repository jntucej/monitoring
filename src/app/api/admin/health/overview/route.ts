// src/app/api/admin/health/overview/route.ts
// GET /api/admin/health/overview
// Sysadmin Health overview aggregator — feeds the 4-tab Health page
// (app / database / infra / redis).
//
// All reads use the server-side Postgres pool (`query` from @/lib/postgres),
// NOT Supabase. Prometheus is used best-effort where a Prometheus source is
// the canonical signal.
//
// Real vs stubbed:
//   app      — REAL: per-hour error rates from api_metrics (last 24h) when the
//              table exists; empty array otherwise.
//   database — REAL: pg_stat_activity connection count + active pool count.
//   infra    — REAL: container_last_seen count via Prometheus when reachable;
//              stub 0/0 when Prometheus is not.
//   redis    — REAL: health-engine redis + worker status;
//              queueDepth stub 0 (no persistent queue table exists yet).
//
// admin-scoped: requiredRole ['sysadmin','admin'].

import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

/** Coerce a Prometheus value[] result to a number (0 when unavailable). */
function promNum(result: unknown): number {
  const arr = (result as { data?: { result?: Array<{ value?: [number, string] }> } })
    ?.data?.result;
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  const v = arr[0]?.value?.[1];
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const GET = withRateLimit(
  withAuthorization(
    async (req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> => {
      void req;
      void ctx;

      // ── app: 24-hour per-hour error rate from api_metrics ─────────
      // Reuses the SQL from src/app/api/sysadmin/application-health for the
      // 5xx proxy and the api_metrics table from schema.sql.
      let errorRate24h: number[] = Array(24).fill(0);
      try {
        const tableExists = await query(
          `SELECT to_regclass('public.api_metrics') IS NOT NULL AS exists`
        );
        if ((tableExists.rows[0] as { exists?: boolean })?.exists) {
          const res = await query(
            `
            SELECT
              FLOOR(EXTRACT(EPOCH FROM timestamp) / 3600) AS hour_bucket,
              COUNT(*) FILTER (WHERE status_code >= 500) * 1.0
                / NULLIF(COUNT(*), 0) AS error_rate
            FROM api_metrics
            WHERE timestamp >= NOW() - INTERVAL '24 hours'
            GROUP BY hour_bucket
            ORDER BY hour_bucket
            `
          );
          const byBucket = new Map<number, number>(
            (res.rows as Array<Record<string, unknown>>).map((r) => [
              Number(r.hour_bucket),
              Number(r.error_rate ?? 0),
            ])
          );
          const currentHour = Math.floor(Date.now() / 3600000);
          errorRate24h = Array.from(
            { length: 24 },
            (_, i) => byBucket.get(currentHour - 23 + i) ?? 0
          );
        }
      } catch {
        // api_metrics unavailable or locked — leave the zero stub
      }

      // ── database: connection counts from pg_stat_activity ───────
      // Mirrors the pg_stat_activity SQL used by src/app/api/sysadmin/
      // database-health.
      let conns = 0;
      let pool = 0;
      try {
        const dbRes = await query(
          `
          SELECT
            count(*)::int                              AS total,
            count(*) FILTER (WHERE state = 'active')::int AS active
          FROM pg_stat_activity
          `
        );
        const row = dbRes.rows[0] as { total?: number; active?: number } | undefined;
        conns = Number(row?.total ?? 0);
        pool = Number(row?.active ?? 0);
      } catch {
        // pg_stat_activity unavailable — leave 0
      }

      // ── infra: container counts via Prometheus (best-effort) ─────
      let containers = 0;
      let running = 0;
      try {
        const { promQuery } = await import("@/lib/monitoring");
        const totalRes = await promQuery(
          'count(container_last_seen{name=~"gate_.*|mon_.*"})'
        );
        containers = promNum(totalRes);
        const runningRes = await promQuery(
          'count(container_last_seen{name=~"gate_.*|mon_.*"} > 0)'
        );
        running = promNum(runningRes);
      } catch {
        // Prometheus unreachable — containers/running stay 0
      }

      // ── redis: health-engine status + worker liveness ────────────
      // Mirrors src/app/api/sysadmin/redis-worker via checkSystemHealth.
      const queueDepth = 0; // stub: no persistent queue table yet
      let workerHealthy = false;
      try {
        const { checkSystemHealth } = await import("@/lib/health");
        const health = await checkSystemHealth();
        const redis = health.components.redis;
        const services = health.components.services as Record<string, { status?: string }>;
        const workerStatus = services?.worker?.status;
        workerHealthy =
          (redis?.status === "healthy" && workerStatus === undefined) ||
          workerStatus === "healthy";
      } catch {
        // health engine unavailable — workerHealthy stays false
      }

      return ok({
        app: { errorRate24h },
        database: {
          conns,
          pool,
          last_check: new Date().toISOString(),
        },
        infra: {
          containers,
          running,
        },
        redis: {
          queue_depth: queueDepth,
          worker_healthy: workerHealthy,
        },
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60_000, maxRequests: 60 }
);
