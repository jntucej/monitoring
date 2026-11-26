/**
 * GET /api/principal/inbox/review
 *
 * Monthly review of principal decisions: count, approval rate, avg resolution
 * time, and last-month delta. Read-only aggregate.
 *
 * Query params:
 *   period — "this-month" | "last-month" (default "this-month")
 */

import { NextRequest } from "next/server";
import { withApiChain } from "@/lib/api-chain";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { getIstDateString } from "@/server/policy/dates";
import type { AuthContext } from "@/lib/authContext";

function periodBounds(period: string, now = new Date()): { from: string; to: string; label: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (period === "last-month") {
    const lm = new Date(y, m - 1, 1);
    const ly = lm.getFullYear();
    const lmm = lm.getMonth();
    return {
      from: `${ly}-${String(lmm + 1).padStart(2, "0")}-01`,
      to: new Date(ly, lmm + 1, 0).toISOString().slice(0, 10),
      label: "Last month",
    };
  }
  return {
    from: `${y}-${String(m + 1).padStart(2, "0")}-01`,
    to: getIstDateString(),
    label: "This month",
  };
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const period = sp.get("period") ?? "this-month";
  const { from, to, label } = periodBounds(period);

  // Current period decisions
  const curR = await query<{
    total: string;
    approved: string;
    rejected: string;
    forwarded: string;
    avg_resolution_hours: string;
  }>(
    `SELECT COUNT(*)::text AS total,
            COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END), 0)::text AS approved,
            COALESCE(SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END), 0)::text AS rejected,
            COALESCE(SUM(CASE WHEN status = 'FORWARDED' THEN 1 ELSE 0 END), 0)::text AS forwarded,
            COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600), 0)::text AS avg_resolution_hours
       FROM permission_requests
      WHERE created_at::date >= $1::date AND created_at::date <= $2::date
        AND status IN ('APPROVED','REJECTED','FORWARDED')`,
    [from, to]
  );

  // Last month for delta
  const now = new Date();
  const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lmFrom = `${lmStart.getFullYear()}-${String(lmStart.getMonth() + 1).padStart(2, "0")}-01`;
  const lmTo = lmEnd.toISOString().slice(0, 10);

  const lmR = await query<{ total: string; approved: string; rejected: string }>(
    `SELECT COUNT(*)::text AS total,
            COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END), 0)::text AS approved,
            COALESCE(SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END), 0)::text AS rejected
       FROM permission_requests
      WHERE created_at::date >= $1::date AND created_at::date <= $2::date
        AND status IN ('APPROVED','REJECTED','FORWARDED')`,
    [lmFrom, lmTo]
  );

  const c = curR.rows[0];
  const l = lmR.rows[0];

  const total = Number(c?.total ?? 0);
  const approved = Number(c?.approved ?? 0);
  const rejected = Number(c?.rejected ?? 0);
  const forwarded = Number(c?.forwarded ?? 0);
  const avgHours = Math.round(Number(c?.avg_resolution_hours ?? 0) * 10) / 10;

  const lmTotal = Number(l?.total ?? 0);
  const lmApproved = Number(l?.approved ?? 0);

  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  const lmApprovalRate = lmTotal > 0 ? Math.round((lmApproved / lmTotal) * 100) : null;

  return ok({
    period: label,
    range: { from, to },
    summary: {
      total, approved, rejected, forwarded,
      approvalRate,
      avgResolutionHours: avgHours,
      lastMonthTotal: lmTotal,
      lastMonthApprovalRate: lmApprovalRate,
      totalDelta: total - lmTotal,
      approvalRateDelta: lmApprovalRate !== null ? approvalRate - lmApprovalRate : null,
    },
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/principal/inbox/review",
  auth: "user",
  requiredRole: ["principal", "admin", "sysadmin"],
  rateLimit: { keyPrefix: "principal-inbox-review", maxRequests: 20, windowMs: 60_000 },
});
