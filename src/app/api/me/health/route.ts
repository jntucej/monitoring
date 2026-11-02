import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

/**
 * GET /api/me/health
 *
 * Plain-language system status for basic users (student, operator,
 * caregiver). One tile: "Gate system: Working normally."
 *
 * No PIDs, no table names, no stack traces — just the one fact a
 * non-technical user needs: "Is it working?"
 *
 * Renders green / yellow / red:
 *   green  — last infra_snapshot < 2 min old, no unhealthy containers,
 *            error rate < 2%
 *   yellow — snapshot stale (> 2 min) or error rate 2-5%
 *   red    — snapshot stale > 5 min or an unhealthy container or
 *            error rate > 5%
 *
 * The "message" field is the human phrase shown on the tile. The "detail"
 * field is a slightly longer sentence for the /student card.
 */
async function handleGet(_req: NextRequest): Promise<Response> {
  const snapshot = await query<{
    captured_at: string;
    db_pool_used: number | null;
    db_pool_max: number | null;
    queue_depth: number | null;
    scan_p95_ms: number | null;
    error_rate: string | null;
    container_unhealthy: string[];
  }>(
    `SELECT captured_at, db_pool_used, db_pool_max, queue_depth,
            scan_p95_ms, error_rate, container_unhealthy
       FROM public.infra_snapshots
      ORDER BY captured_at DESC LIMIT 1`
  ).catch(() => ({ rows: [] as never[] }));

  const latest = snapshot.rows[0];

  let status = "green";
  let message = "Gate system: Working normally.";
  let detail = "All systems are running. Your scans and actions are working as usual.";

  if (!latest) {
    status = "yellow";
    message = "Gate system: Checking status…";
    detail = "We're confirming the system is up. Scans still work in the meantime.";
  } else {
    const ageSec = (Date.now() - new Date(latest.captured_at).getTime()) / 1000;
    const unhealthy = latest.container_unhealthy ?? [];
    const errRate = latest.error_rate != null ? Number(latest.error_rate) : 0;

    if (unhealthy.length > 0 || errRate > 0.05 || ageSec > 300) {
      status = "red";
      message = "Gate system: Slower than usual.";
      detail = "Some parts of the system are under pressure. Your scans still work — we've been notified and are looking into it.";
    } else if (ageSec > 120 || errRate > 0.02) {
      status = "yellow";
      message = "Gate system: Slower than usual.";
      detail = "Some scans may take longer than usual. Everything still works.";
    }
  }

  // Last open incident (for the "we're on it" sentence when red)
  let openIncident: { severity: string; title: string } | null = null;
  if (status === "red") {
    const inc = await query<{ severity: string; title: string }>(
      `SELECT severity, title FROM public.status_updates
        WHERE severity = 'SEV-1' AND resolved_at IS NULL
        ORDER BY created_at DESC LIMIT 1`
    ).catch(() => ({ rows: [] as never[] }));
    if (inc.rows[0]) openIncident = inc.rows[0];
  }

  return ok({
    status,
    message,
    detail,
    openIncident,
    checkUrl: "/status",
  });
}

export const GET = withRateLimit(handleGet, {
  keyPrefix: "me_health",
  maxRequests: 300,
});
