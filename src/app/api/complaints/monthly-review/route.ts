/**
 * GET /api/complaints/monthly-review
 *
 * Monthly complaint trend: count by day, avg resolution time, top
 * categories, last-month delta. Read-only aggregate.
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
  const today = getIstDateString();
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
    to: today,
    label: "This month",
  };
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const period = sp.get("period") ?? "this-month";
  const { from, to, label } = periodBounds(period);

  // Last month for delta
  const now = new Date();
  const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lmFrom = `${lmStart.getFullYear()}-${String(lmStart.getMonth() + 1).padStart(2, "0")}-01`;
  const lmTo = lmEnd.toISOString().slice(0, 10);

  // Daily trend for current period
  const trendR = await query<{ day: string; count: string }>(
    `SELECT to_char(created_at, 'YYYY-MM-DD') AS day,
            COUNT(*)::text AS count
       FROM complaints
      WHERE created_at::date >= $1::date AND created_at::date <= $2::date
      GROUP BY to_char(created_at, 'YYYY-MM-DD')
      ORDER BY 1`,
    [from, to]
  );

  // Current period total + resolution time
  const curR = await query<{ total: string; resolved: string; avg_hours: string }>(
    `SELECT COUNT(*)::text AS total,
            COALESCE(SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END), 0)::text AS resolved,
            COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600), 0)::text AS avg_hours
       FROM complaints
      WHERE created_at::date >= $1::date AND created_at::date <= $2::date`,
    [from, to]
  );

  // Last month total
  const lmR = await query<{ total: string; resolved: string }>(
    `SELECT COUNT(*)::text AS total,
            COALESCE(SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END), 0)::text AS resolved
       FROM complaints
      WHERE created_at::date >= $1::date AND created_at::date <= $2::date`,
    [lmFrom, lmTo]
  );

  // Top categories
  const catR = await query<{ code: string; count: string }>(
    `SELECT cc.code,
            COUNT(*)::text AS count
       FROM complaints c
       JOIN complaint_categories cc ON cc.code = c.category_code
      WHERE c.created_at::date >= $1::date AND c.created_at::date <= $2::date
      GROUP BY cc.code
      ORDER BY count DESC
      LIMIT 5`,
    [from, to]
  );

  const cur = curR.rows[0];
  const lm = lmR.rows[0];

  const total = Number(cur?.total ?? 0);
  const resolved = Number(cur?.resolved ?? 0);
  const avgHours = Math.round(Number(cur?.avg_hours ?? 0) * 10) / 10;
  const lmTotal = Number(lm?.total ?? 0);
  const lmResolved = Number(lm?.resolved ?? 0);

  // Build trend with zero-fill for missing days
  const trendMap = new Map(trendR.rows.map((r) => [r.day, Number(r.count)]));
  const trend: Array<{ day: string; count: number }> = [];
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    trend.push({ day: key, count: trendMap.get(key) ?? 0 });
  }

  return ok({
    period: label,
    range: { from, to },
    summary: {
      total,
      resolved,
      open: total - resolved,
      avgResolutionHours: avgHours,
      lastMonthTotal: lmTotal,
      lastMonthResolved: lmResolved,
      totalDelta: total - lmTotal,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    },
    trend,
    topCategories: catR.rows.map((r) => ({ code: r.code, count: Number(r.count) })),
  });
}

export const GET = withApiChain(implGet, {
  route: "/api/complaints/monthly-review",
  auth: "user",
  requiredRole: ["admin", "sysadmin", "principal"],
  rateLimit: { keyPrefix: "complaints-monthly-review", maxRequests: 20, windowMs: 60_000 },
});
