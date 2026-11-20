/**
 * GET /api/engagement/achievements/review
 *
 * Monthly achievements review: earned count, per-category breakdown,
 * last-month delta. Read-only.
 *
 * Query params:
 *   period — "this-month" | "last-month" (default "this-month")
 */

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
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

  // Current period: total earned + per-category
  const curR = await query<{ category: string; count: string }>(
    `SELECT COALESCE(ad.category, 'General') AS category,
            COUNT(*)::text AS count
       FROM user_achievements ua
       LEFT JOIN achievement_definitions ad ON ad.code = ua.achievement_code
      WHERE ua.user_id = $1::uuid
        AND ua.earned_at::date >= $2::date AND ua.earned_at::date <= $3::date
      GROUP BY COALESCE(ad.category, 'General')
      ORDER BY count DESC`,
    [auth.userId, from, to]
  );

  const curTotal = curR.rows.reduce((s, r) => s + Number(r.count), 0);

  // Last month total
  const lmR = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
       FROM user_achievements
      WHERE user_id = $1::uuid
        AND earned_at::date >= $2::date AND earned_at::date <= $3::date`,
    [auth.userId, lmFrom, lmTo]
  );
  const lmTotal = Number(lmR.rows[0]?.total ?? 0);

  return ok({
    period: label,
    range: { from, to },
    summary: {
      total: curTotal,
      lastMonthTotal: lmTotal,
      delta: curTotal - lmTotal,
    },
    categories: curR.rows.map((r) => ({
      category: r.category,
      count: Number(r.count),
    })),
  });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["student", "parent", "guardian", "admin", "sysadmin"] }),
  { keyPrefix: "engagement-ach-review", maxRequests: 30, windowMs: 60_000 }
);
