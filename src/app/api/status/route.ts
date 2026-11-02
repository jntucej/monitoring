import { NextRequest } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

/**
 * GET /api/status
 *
 * Public, unauthenticated. Serves the /status page data:
 *
 *   • live health — last 3 infra_snapshots + container health
 *   • incidents   — last 5 status_updates rows (SEV-1/2/3/4 + RESOLVED)
 *   • rto_rpo     — the RTO/RPO targets from RUNBOOK.md
 *   • contacts    — the escalation ladder
 *
 * The Caddyfile serves a static /status page that fetches this endpoint
 * (and falls back to the last-known-good JSON in static/status.json when
 * the web container is down). This is the page that must never depend
 * on Next.js.
 */
async function handleGet(_req: NextRequest): Promise<Response> {
  const snapshot = await query<{
    captured_at: string;
    db_pool_used: number | null;
    db_pool_max: number | null;
    queue_depth: number | null;
    disk_free_pct: string | null;
    scan_p95_ms: number | null;
    error_rate: string | null;
    container_unhealthy: string[];
  }>(
    `SELECT captured_at, db_pool_used, db_pool_max, queue_depth,
            disk_free_pct, scan_p95_ms, error_rate, container_unhealthy
       FROM public.infra_snapshots
      ORDER BY captured_at DESC LIMIT 3`
  ).catch(() => ({ rows: [] as never[] }));

  const incidents = await query<{
    id: string;
    created_at: string;
    severity: string;
    title: string;
    detail: string | null;
    resolved_at: string | null;
  }>(
    `SELECT id, created_at, severity, title, detail, resolved_at
       FROM public.status_updates
      ORDER BY created_at DESC LIMIT 5`
  ).catch(() => ({ rows: [] as never[] }));

  const ladder = await query<{
    level: number;
    role: string;
    notify_at_min: number;
    channels: string[];
  }>(
    `SELECT level, role, notify_at_min, channels FROM public.escalation_contacts ORDER BY level`
  ).catch(() => ({ rows: [] as never[] }));

  // Overall status: green if last snapshot is < 2 min old and no unhealthy
  // containers; yellow if stale or degraded; red if web is unreachable
  // (this endpoint wouldn't be serving at all) or a container is unhealthy.
  const latest = snapshot.rows[0];
  let status = "green";
  if (latest) {
    const ageSec = (Date.now() - new Date(latest.captured_at).getTime()) / 1000;
    if (ageSec > 120) status = "yellow";
    if ((latest.container_unhealthy ?? []).length > 0) status = "red";
    if (latest.error_rate != null && Number(latest.error_rate) > 0.05) status = "red";
  } else {
    status = "yellow"; // no snapshots at all — predictor may be stale
  }

  const hasOpenSev = incidents.rows.some(
    (i) => i.severity === "SEV-1" && !i.resolved_at
  );
  if (hasOpenSev) status = "red";

  return ok({
    status,
    rto_hours: 4,
    rpo_hours: 1,
    live: latest
      ? {
          capturedAt: latest.captured_at,
          dbPoolUsed: latest.db_pool_used,
          dbPoolMax: latest.db_pool_max,
          queueDepth: latest.queue_depth,
          diskFreePct: latest.disk_free_pct != null ? Number(latest.disk_free_pct) : null,
          scanP95Ms: latest.scan_p95_ms,
          errorRate: latest.error_rate != null ? Number(latest.error_rate) : null,
          unhealthyContainers: latest.container_unhealthy ?? [],
        }
      : null,
    incidents: incidents.rows,
    escalationLadder: ladder.rows,
    runbookUrl: "/sysadmin/runbooks",
  });
}

export const GET = withRateLimit(handleGet, {
  keyPrefix: "public_status",
  maxRequests: 600,
});
