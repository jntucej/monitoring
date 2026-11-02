import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";

/**
 * GET /api/sysadmin/forecasts
 *
 * Phase 7c of the autonomous SRE loop: the sysadmin dashboard's
 * "Forecasts" + "Live health" + "Action ledger" sections.
 *
 *   • latest_snapshot  — the newest infra_snapshots row (pool, queue, SSE,
 *                        disk %, p95, error rate, backup age, unhealthy
 *                        containers). The dashboard renders this as the
 *                        "live health" tile strip.
 *   • forecasts        — infra_forecasts rows ordered by predicted_breach_at
 *                        ascending, so the soonest breach is on top.
 *   • ledger_summary   — operator_actions counts by status so the
 *                        "Pending approval / Auto-executed / Failed /
 *                        Escalated" tabs show a count each.
 *
 * Read-only, sysadmin/admin.
 */
async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  void _ctx;

  const snapshot = await query<{
    captured_at: string;
    db_pool_used: number | null;
    db_pool_max: number | null;
    queue_depth: number | null;
    sse_streams: number | null;
    sse_capacity: number | null;
    disk_free_pct: string | null;
    scan_p95_ms: number | null;
    error_rate: string | null;
    backup_age_hours: string | null;
    container_unhealthy: string[];
  }>(
    `SELECT captured_at, db_pool_used, db_pool_max, queue_depth, sse_streams, sse_capacity,
            disk_free_pct, scan_p95_ms, error_rate, backup_age_hours, container_unhealthy
       FROM public.infra_snapshots
      ORDER BY captured_at DESC LIMIT 1`
  ).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    if (/relation .*infra_snapshots/i.test(msg)) {
      return { rows: [] as unknown as typeof handleGet extends never ? never : never[] } as never;
    }
    throw err;
  });

  const latest = snapshot.rows[0] ?? null;

  const forecasts = await query<{
    id: string;
    signal: string;
    predicted_breach_at: string;
    predicted_value: string | null;
    confidence: string;
    recommended_action: string;
    evidence: unknown;
    created_at: string;
  }>(
    `SELECT id, signal, predicted_breach_at, predicted_value, confidence,
            recommended_action, evidence, created_at
       FROM public.infra_forecasts
      ORDER BY predicted_breach_at ASC
      LIMIT 50`
  ).catch(() => ({ rows: [] as never[] }));

  const ledger = await query<{ status: string; cnt: string }>(
    `SELECT status, count(*)::int AS cnt
       FROM public.operator_actions
      GROUP BY status`
  ).catch(() => ({ rows: [] as Array<{ status: string; cnt: number }> }));

  const ledgerMap: Record<string, number> = {
    pending: 0,
    approved: 0,
    executed: 0,
    auto_executed: 0,
    rejected: 0,
    expired: 0,
    failed: 0,
  };
  for (const r of ledger.rows) {
    const cnt = Number(r.cnt);
    if (r.status in ledgerMap) ledgerMap[r.status] = cnt;
  }

  return ok({
    latestSnapshot: latest
      ? {
          capturedAt: latest.captured_at,
          dbPoolUsed: latest.db_pool_used,
          dbPoolMax: latest.db_pool_max,
          queueDepth: latest.queue_depth,
          sseStreams: latest.sse_streams,
          sseCapacity: latest.sse_capacity,
          diskFreePct: latest.disk_free_pct != null ? Number(latest.disk_free_pct) : null,
          scanP95Ms: latest.scan_p95_ms,
          errorRate: latest.error_rate != null ? Number(latest.error_rate) : null,
          backupAgeHours: latest.backup_age_hours != null ? Number(latest.backup_age_hours) : null,
          containerUnhealthy: latest.container_unhealthy ?? [],
        }
      : null,
    forecasts: forecasts.rows.map((f) => ({
      id: f.id,
      signal: f.signal,
      predictedBreachAt: f.predicted_breach_at,
      predictedValue: f.predicted_value != null ? Number(f.predicted_value) : null,
      confidence: Number(f.confidence),
      recommendedAction: f.recommended_action,
      evidence: f.evidence,
      createdAt: f.created_at,
    })),
    ledger: ledgerMap,
  });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["sysadmin", "admin"] }),
  { keyPrefix: "sysadmin_forecasts", maxRequests: 120 }
);
