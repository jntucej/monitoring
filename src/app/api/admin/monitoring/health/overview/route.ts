// src/app/api/admin/monitoring/health/overview/route.ts
// GET /api/admin/monitoring/health/overview
// Admin Monitoring Health overview aggregator — mirrors the health architecture in
// src/app/api/admin/health/overview/route.ts and src/app/api/admin/monitoring/**,
// querying api_metrics, pg_stat_activity, Prometheus container counts, Redis health,
// and system_settings.
//
// Conforms to HealthData from @/components/sysadmin/domains/monitoring/types.

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

interface SystemSettingRow {
  id: string;
  value: unknown;
  updated_at: string;
}

export const GET = withRateLimit(
  withAuthorization(
    async (_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      // ── app: 24-hour per-hour error rate from api_metrics ─────────
      let errorRate24h: number[] = Array(24).fill(0);
      try {
        const tableExists = await query<{ exists: boolean }>(
          `SELECT to_regclass('public.api_metrics') IS NOT NULL AS exists`
        );
        if (tableExists.rows[0]?.exists) {
          const res = await query<{ hour_bucket: string | number; error_rate: string | number }>(
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
            res.rows.map((r) => [
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
        // api_metrics unavailable or query failed — safe zero fallback
      }

      // ── database: connection counts from pg_stat_activity ───────
      let conns = 0;
      let pool = 0;
      const lastCheckIso = new Date().toISOString();
      try {
        const dbRes = await query<{ total: number; active: number }>(
          `
          SELECT
            count(*)::int AS total,
            count(*) FILTER (WHERE state = 'active')::int AS active
          FROM pg_stat_activity
          `
        );
        const row = dbRes.rows[0];
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
        // Prometheus unreachable in current container network — 0 fallback
      }

      // ── redis: health-engine status + worker liveness ────────────
      const queueDepth = 0;
      let workerHealthy = false;
      try {
        const { checkSystemHealth } = await import("@/lib/health");
        const health = await checkSystemHealth();
        const redis = health.components.redis;
        const services = health.components.services as Record<string, { status?: string }> | undefined;
        const workerStatus = services?.worker?.status;
        workerHealthy =
          (redis?.status === "healthy" && workerStatus === undefined) ||
          workerStatus === "healthy";
      } catch {
        // health engine unavailable — workerHealthy stays false
      }

      // ── system_settings: health-relevant operational configurations ─
      let systemSettings: SystemSettingRow[] = [];
      try {
        const settingsRes = await query<SystemSettingRow>(
          `
          SELECT
            id,
            value,
            updated_at::text AS updated_at
          FROM system_settings
          ORDER BY id ASC
          `
        );
        systemSettings = settingsRes.rows;
      } catch {
        // system_settings unavailable — empty fallback
      }

      const peakError = errorRate24h.length > 0 ? Math.max(...errorRate24h) : 0;
      const avgError =
        errorRate24h.length > 0
          ? errorRate24h.reduce((a, b) => a + b, 0) / errorRate24h.length
          : 0;

      // Populate items with typed entities representing monitored services
      const items = [
        {
          id: "app",
          name: "API Application Health",
          status: peakError > 0.05 ? "degraded" : "healthy",
          peak_error_rate: peakError,
          avg_error_rate: avgError,
        },
        {
          id: "database",
          name: "PostgreSQL Database Activity",
          status: conns > 0 ? "healthy" : "warning",
          active_connections: conns,
          active_pool_slots: pool,
          last_check: lastCheckIso,
        },
        {
          id: "infra",
          name: "Container Fleet",
          status: containers > 0 && running === containers ? "healthy" : "warning",
          containers_total: containers,
          containers_running: running,
        },
        {
          id: "redis",
          name: "Redis & Background Worker",
          status: workerHealthy ? "healthy" : "degraded",
          queue_depth: queueDepth,
          worker_healthy: workerHealthy,
        },
        ...systemSettings.map((s) => ({
          id: `setting-${s.id}`,
          name: `System Config: ${s.id}`,
          status: "configured",
          updated_at: s.updated_at,
          value: s.value,
        })),
      ];

      return ok({
        app: { errorRate24h },
        database: {
          conns,
          pool,
          last_check: lastCheckIso,
        },
        infra: {
          containers,
          running,
        },
        redis: {
          queue_depth: queueDepth,
          worker_healthy: workerHealthy,
        },
        system_settings: systemSettings,
        items,
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60_000, maxRequests: 60 }
);
