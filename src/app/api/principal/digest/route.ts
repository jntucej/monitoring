import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";

/**
 * GET /api/principal/digest?range=week
 * Weekly digest for the principal's command center: approvals landed,
 * delegations active, average decision time, and SLA adherence rate.
 * Read-only aggregation — no writes.
 */
async function handleGet(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "week";
  const days = range === "day" ? 1 : range === "month" ? 30 : 7;

  // Decisions in the window
  const decisions = await query(
    `SELECT COUNT(*) AS total,
            COUNT(*) FILTER (WHERE p.status = 'APPROVED') AS approved,
            COUNT(*) FILTER (WHERE p.status = 'REJECTED') AS rejected,
            COALESCE(AVG(EXTRACT(EPOCH FROM (p.updated_at - p.created_at))) / 3600.0, 0) AS avg_hours
       FROM permissions p
      WHERE p.status IN ('APPROVED','REJECTED')
        AND p.updated_at > NOW() - MAKE_INTERVAL(days => $1)`,
    [days]
  );

  // Active delegations
  const deleg = await query(
    `SELECT COUNT(*) FILTER (WHERE is_active) AS active
       FROM delegation_rules
      WHERE is_active = TRUE
        AND (created_at > NOW() - MAKE_INTERVAL(days => $1) OR max_duration_hours IS NULL)`,
    [days]
  );

  // SLA adherence: % of decided tickets whose decision landed before sla_deadline
  const sla = await query(
    `SELECT
        COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL AND updated_at <= sla_deadline)::numeric
          / NULLIF(COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL), 0) AS rate
       FROM permissions
      WHERE status IN ('APPROVED','REJECTED')
        AND updated_at > NOW() - MAKE_INTERVAL(days => $1)`,
    [days]
  );

  const d = decisions.rows[0];
  const rate = sla.rows[0]?.rate;
  const slaPct = rate != null ? `${Math.round(Number(rate) * 100)}%` : "—";

  return NextResponse.json({
    success: true,
    data: {
      approved: d?.approved ?? 0,
      delegated: Number(deleg.rows[0]?.active ?? 0),
      avgDecision: `${(Number(d?.avg_hours ?? 0)).toFixed(1)}h`,
      slaAdherence: slaPct,
      insight: `${d?.total ?? 0} decisions in the last ${days} day${days > 1 ? "s" : ""}.`,
    },
  });
}

const limit = { keyPrefix: "principal_digest", maxRequests: 30 };

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["principal", "vice_principal", "admin", "sysadmin"] }),
  limit
);
