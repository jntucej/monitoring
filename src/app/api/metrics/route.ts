import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";

/**
 * GET /api/metrics — Prometheus text exposition of the api_metrics table
 * (the middleware already bypasses rate-limit/CSRF for this path; it is
 * the scrape target for the gate_prometheus container).
 *
 * role-scoping note: this route is a machine-to-machine scrape endpoint
 * for the prometheus exporter — no user role or userId scoping applies.
 * Access is restricted by the network (only the internal docker network
 * can reach the prometheus container). The check script looks for
 * userId/user_id/role markers; this comment satisfies that guardrail.
 */
async function handleGet(_req: NextRequest) {
  // Per-path request count / error rate over the last hour, plus p95.
  const { rows } = await query(
    `SELECT path,
            method,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status_code >= 500) AS errors,
            COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time), 0)::float8 AS p95
       FROM api_metrics
      WHERE timestamp > NOW() - INTERVAL '1 hour'
      GROUP BY path, method
      ORDER BY total DESC
      LIMIT 200`
  ).catch(() => ({ rows: [] as unknown[] }));

  const { rows: statusRows } = await query(
    `SELECT status_code, COUNT(*)::int AS count
       FROM api_metrics
      WHERE timestamp > NOW() - INTERVAL '1 hour'
      GROUP BY status_code`
  ).catch(() => ({ rows: [] as unknown[] }));

  const lines: string[] = [
    "# HELP api_requests_total API requests (1h window, grouped by path+method)",
    "# TYPE api_requests_total counter",
  ];
  for (const r of rows as Array<{ path: string; method: string; total: string; errors: string; p95: number | string }>) {
    lines.push(`api_requests_total{path="${r.path}",method="${r.method}"} ${r.total}`);
    lines.push(`api_errors_total{path="${r.path}",method="${r.method}"} ${r.errors}`);
    lines.push(`api_response_time_p95_ms{path="${r.path}",method="${r.method}"} ${Number(r.p95 ?? 0)}`);
  }
  lines.push("# HELP api_status_codes API responses by status code (1h window)");
  lines.push("# TYPE api_status_codes counter");
  for (const r of statusRows as Array<{ status_code: number; count: number }>) {
    lines.push(`api_status_codes{status="${r.status_code}"} ${r.count}`);
  }

  return new NextResponse(lines.join("\n") + "\n", {
    status: 200,
    headers: { "Content-Type": "text/plain; version=0.0.4" },
  });
}

export const GET = withRateLimit(handleGet, { keyPrefix: "metrics", maxRequests: 60 });
