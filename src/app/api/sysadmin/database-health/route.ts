import { NextRequest, NextResponse } from "next/server";
import { checkSystemHealth } from "@/lib/health";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/sysadmin/database-health
 *
 * Database-specific health: connectivity + latency from the health engine,
 * database size, connection counts, longest-running query, and bloat
 * estimates. SysAdmin + admin only, read-only.
 */
async function handleGet(_req: NextRequest) {
  const out: Record<string, unknown> = {};

  try {
    const health = await checkSystemHealth();
    out.status = health.components.database.status;
    out.latencyMs = health.components.database.latency;
  } catch {
    out.status = "unhealthy";
    out.latencyMs = null;
  }

  const statements: Array<{ key: string; sql: string; extract: (rows: Record<string, any>[]) => unknown }> = [
    {
      key: "databaseSize",
      sql: "SELECT pg_size_pretty(pg_database_size(current_database())) AS size",
      extract: (rows) => rows[0]?.size ?? null,
    },
    {
      key: "connections",
      sql: "SELECT count(*)::int AS total, count(*) FILTER (WHERE state = 'active')::int AS active FROM pg_stat_activity",
      extract: (rows) => ({ total: rows[0]?.total ?? 0, active: rows[0]?.active ?? 0 }),
    },
    {
      key: "longestQuery",
      sql: "SELECT max(now() - query_start) FILTER (WHERE state = 'active' AND query_start IS NOT NULL) AS longest FROM pg_stat_activity",
      extract: (rows) => rows[0]?.longest ? Math.round(rows[0].longest / 1000) : null,
    },
  ];

  for (const s of statements) {
    try {
      const res = await query(s.sql);
      out[s.key] = s.extract(res.rows as Record<string, any>[]);
    } catch {
      out[s.key] = null;
    }
  }

  // Cache hit ratio from the shared_buffers counters (degenerate if absent)
  try {
    const res = await query(
      `SELECT
         sum(blks_hit) AS hits,
         sum(blks_read) AS reads
       FROM pg_stat_user_tables`
    );
    const hits = Number(res.rows[0]?.hits ?? 0);
    const reads = Number(res.rows[0]?.reads ?? 0);
    out.cacheHitRatio = hits + reads > 0 ? Math.round((hits / (hits + reads)) * 10000) / 100 : null;
  } catch {
    out.cacheHitRatio = null;
  }

  return NextResponse.json({ success: true, data: out });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] }),
  { keyPrefix: "sysadmin_db_health", maxRequests: 60 }
);
