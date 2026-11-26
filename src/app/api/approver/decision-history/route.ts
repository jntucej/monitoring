/**
 * GET /api/approver/decision-history
 *
 * Cross-entity decision history for the approver consoles.
 * Sources the caller's decisions from permission_requests.stage_history
 * (the JSONB audit trail: actor_id + action + timestamp + comment),
 * plus a period-scoped aggregate.
 *
 * Query params:
 *   period — "this-month" | "last-month" | "all" (default "this-month")
 *   limit  — max decisions to return (default 25, max 100)
 */

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { getIstDateString } from "@/server/policy/dates";
import type { AuthContext } from "@/lib/authContext";

function periodBounds(period: string, now = new Date()): { from: string | null; to: string; label: string } {
  const today = getIstDateString();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case "last-month": {
      const lm = new Date(y, m - 1, 1);
      const ly = lm.getFullYear();
      const lmm = lm.getMonth();
      return {
        from: `${ly}-${String(lmm + 1).padStart(2, "0")}-01`,
        to: new Date(ly, lmm + 1, 0).toISOString().slice(0, 10),
        label: "Last month",
      };
    }
    case "all":
      return { from: null, to: today, label: "All time" };
    default:
      return { from: `${y}-${String(m + 1).padStart(2, "0")}-01`, to: today, label: "This month" };
  }
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const period = sp.get("period") ?? "this-month";
  const limit = Math.min(100, Number(sp.get("limit") ?? 25) || 25);
  const { from, to, label } = periodBounds(period);

  // The newest transition is the last element of stage_history (JSONB array).
  // A decision "belongs" to the caller when that last entry's actor_id matches.
  const callerFilter =
    `(pr.stage_history IS NOT NULL
       AND jsonb_array_length(pr.stage_history) > 0
       AND (pr.stage_history -> -1 ->> 'actor_id') = $1::text)`;

  const fromClause = from ? `AND pr.updated_at::date >= $3::date` : "";
  const params: unknown[] = [auth.userId, to, ...(from ? [from] : [])];

  const rows = await query<{
    ticket_number: string;
    workflow_type: string;
    status: string;
    last_action: string | null;
    last_comment: string | null;
    last_at: string;
  }>(
    `SELECT pr.ticket_number,
            pr.workflow_type,
            pr.status,
            (pr.stage_history -> -1 ->> 'action') AS last_action,
            (pr.stage_history -> -1 ->> 'comment') AS last_comment,
            COALESCE(
              to_char((pr.stage_history -> -1 ->> 'timestamp')::timestamptz, 'YYYY-MM-DD HH24:MI'),
              to_char(pr.updated_at, 'YYYY-MM-DD HH24:MI')
            ) AS last_at
       FROM permission_requests pr
      WHERE pr.status IN ('APPROVED','REJECTED','ESCALATED','COMPLETED')
        AND pr.updated_at::date <= $2
        ${fromClause}
        AND ${callerFilter}
      ORDER BY pr.updated_at DESC
      LIMIT $${params.length + 1}`,
    [...params, limit]
  );

  const aggR = await query<{ approved: string; rejected: string; escalated: string }>(
    `SELECT COALESCE(SUM(CASE WHEN pr.status='APPROVED' THEN 1 ELSE 0 END),0)::text AS approved,
            COALESCE(SUM(CASE WHEN pr.status='REJECTED' THEN 1 ELSE 0 END),0)::text AS rejected,
            COALESCE(SUM(CASE WHEN pr.status IN ('ESCALATED','COMPLETED') THEN 1 ELSE 0 END),0)::text AS escalated
       FROM permission_requests pr
      WHERE pr.status IN ('APPROVED','REJECTED','ESCALATED','COMPLETED')
        AND pr.updated_at::date <= $2
        ${from ? `AND pr.updated_at::date >= $3` : ""}
        AND ${callerFilter}`,
    params
  );
  const agg = aggR.rows[0];

  return ok({
    period: label,
    limit,
    count: rows.rows.length,
    decisions: rows.rows.map((d) => ({
      ticket: d.ticket_number,
      type: d.workflow_type,
      status: d.status,
      action: d.last_action ?? d.status,
      comment: d.last_comment,
      decidedAt: d.last_at,
    })),
    totals: {
      approved: Number(agg?.approved ?? 0),
      rejected: Number(agg?.rejected ?? 0),
      escalated: Number(agg?.escalated ?? 0),
    },
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/approver/decision-history",
  auth: "user",
  rateLimit: { keyPrefix: "approver-decision-history", maxRequests: 30, windowMs: 60_000 },
});
