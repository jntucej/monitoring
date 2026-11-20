/**
 * GET /api/mess/reviews/aggregate
 *
 * Monthly / last-month / overall review aggregation for mess incharge + admin dashboards.
 *
 * Query params:
 *   period    — "this-month" | "last-month" | "all-time" (default "this-month")
 *   meal      — "BREAKFAST" | "LUNCH" | "DINNER" (optional filter)
 *
 * Returns per-meal avg rating + count + last-month side-by-side + lifetime overall.
 */

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { getIstDateString } from "@/server/policy/dates";
import type { AuthContext } from "@/lib/authContext";

// Satisfaction values map to numeric scores for averaging
const SAT_SCORE: Record<string, number> = {
  EXCELLENT: 5,
  GOOD: 4,
  AVERAGE: 3,
  POOR: 2,
  TERRIBLE: 1,
};

function toNumeric(satisfaction: string): number {
  return SAT_SCORE[satisfaction] ?? 0;
}

function periodBounds(period: string, now = new Date()): { from: string; to: string; label: string } {
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
    case "all-time":
      return { from: "2020-01-01", to: getIstDateString(), label: "All time" };
    default:
      return {
        from: `${y}-${String(m + 1).padStart(2, "0")}-01`,
        to: getIstDateString(),
        label: "This month",
      };
  }
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sp = req.nextUrl.searchParams;
  const period = sp.get("period") ?? "this-month";
  const mealFilter = sp.get("meal")?.toUpperCase() || null;

  // Validate access
  const allowedRoles = ["mess_incharge", "principal", "admin", "sysadmin"];
  if (!allowedRoles.includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const { from, to, label } = periodBounds(period);

  // Last month for delta
  const now = new Date();
  const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lmFrom = `${lmStart.getFullYear()}-${String(lmStart.getMonth() + 1).padStart(2, "0")}-01`;
  const lmTo = lmEnd.toISOString().slice(0, 10);

  // Where clause for meal filter
  const mealWhere = mealFilter ? "AND r.meal_type = $2" : "";
  const mealParams = mealFilter ? [mealFilter] : [];

  // Current period per-meal aggregates
  const curR = await query<{
    meal_type: string;
    avg_score: string;
    count: string;
    complaints: string;
  }>(
    `SELECT r.meal_type,
            COALESCE(AVG(CASE r.satisfaction
              WHEN 'EXCELLENT' THEN 5 WHEN 'GOOD' THEN 4 WHEN 'AVERAGE' THEN 3
              WHEN 'POOR' THEN 2 WHEN 'TERRIBLE' THEN 1 ELSE 0
            END), 0)::text AS avg_score,
            COUNT(*)::text AS count,
            COALESCE(SUM(CASE WHEN r.satisfaction IN ('POOR','TERRIBLE') THEN 1 ELSE 0 END), 0)::text AS complaints
       FROM public.mess_meal_reviews r
      WHERE r.deleted_at IS NULL
        AND r.review_date >= $1::date AND r.review_date <= $${mealFilter ? 3 : 2}::date
      ${mealWhere ? `AND r.meal_type = $${mealFilter ? 2 : 1}` : ""}
      GROUP BY r.meal_type`,
    [from, ...mealParams, to]
  );

  // Last month per-meal aggregates
  const lmR = await query<{
    meal_type: string;
    avg_score: string;
    count: string;
  }>(
    `SELECT r.meal_type,
            COALESCE(AVG(CASE r.satisfaction
              WHEN 'EXCELLENT' THEN 5 WHEN 'GOOD' THEN 4 WHEN 'AVERAGE' THEN 3
              WHEN 'POOR' THEN 2 WHEN 'TERRIBLE' THEN 1 ELSE 0
            END), 0)::text AS avg_score,
            COUNT(*)::text AS count
       FROM public.mess_meal_reviews r
      WHERE r.deleted_at IS NULL
        AND r.review_date >= $1::date AND r.review_date <= $2::date
      ${mealFilter ? `AND r.meal_type = $3` : ""}
      GROUP BY r.meal_type`,
    mealFilter ? [lmFrom, lmTo, mealFilter] : [lmFrom, lmTo]
  );

  // Overall lifetime
  const overallR = await query<{ avg_score: string; total: string }>(
    `SELECT COALESCE(AVG(CASE r.satisfaction
      WHEN 'EXCELLENT' THEN 5 WHEN 'GOOD' THEN 4 WHEN 'AVERAGE' THEN 3
      WHEN 'POOR' THEN 2 WHEN 'TERRIBLE' THEN 1 ELSE 0
    END), 0)::text AS avg_score,
            COUNT(*)::text AS total
       FROM public.mess_meal_reviews r
      WHERE r.deleted_at IS NULL`
  );

  const curMap = new Map(curR.rows.map((r) => [r.meal_type, r]));
  const lmMap = new Map(lmR.rows.map((r) => [r.meal_type, r]));

  const meals = mealFilter ? [mealFilter] : ["BREAKFAST", "LUNCH", "DINNER"];

  const perMeal = meals.map((m) => {
    const cur = curMap.get(m);
    const lm = lmMap.get(m);
    const avg = cur ? Math.round(Number(cur.avg_score) * 10) / 10 : 0;
    const lmAvg = lm ? Math.round(Number(lm.avg_score) * 10) / 10 : null;
    return {
      meal: m,
      avg,
      count: cur ? Number(cur.count) : 0,
      complaints: cur ? Number(cur.complaints) : 0,
      lastMonthAvg: lmAvg,
      delta: lmAvg !== null ? Math.round((avg - lmAvg) * 10) / 10 : null,
    };
  });

  const overall = overallR.rows[0];
  const overallAvg = overall ? Math.round(Number(overall.avg_score) * 10) / 10 : 0;
  const overallTotal = overall ? Number(overall.total) : 0;

  return ok({
    period: label,
    range: { from, to },
    perMeal,
    overall: { avg: overallAvg, total: overallTotal },
  });
}

export const GET = withAuthorization(
  withRateLimit(implGet, { windowMs: 60_000, maxRequests: 30 }),
  {}
);
