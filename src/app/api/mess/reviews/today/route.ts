// src/app/api/mess/reviews/today/route.ts
// GET — 3-meal cockpit for mess-incharge: per-meal distribution, avg score,
// and negative fraction for today.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { getIstDateString } from "@/server/policy/dates";
import type { AuthContext } from "@/lib/authContext";
import { MEAL_TYPES, SATISFACTION_LEVELS, satisfactionScore, type Satisfaction } from "@/lib/mess-reviews";

const STAFF = new Set([
  "mess_incharge",
  "hostel_manager",
  "principal",
  "admin",
  "sysadmin",
]);

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!STAFF.has(auth.role)) return ok({ today: null });

  const today = getIstDateString();
  const { rows } = await query<{
    meal_type: string;
    satisfaction: string;
    count: number;
  }>(
    `SELECT meal_type, satisfaction, COUNT(*)::int AS count
       FROM public.mess_meal_reviews
      WHERE review_date = $1 AND deleted_at IS NULL
      GROUP BY meal_type, satisfaction`,
    [today],
  );

  // Pivot: byMeal[MEAL][SATISFACTION] = count.
  const byMeal: Record<string, Record<string, number>> = {};
  for (const m of MEAL_TYPES) {
    byMeal[m] = {};
    for (const s of SATISFACTION_LEVELS) byMeal[m][s.value] = 0;
  }
  for (const r of rows) {
    if (byMeal[r.meal_type]) byMeal[r.meal_type][r.satisfaction] = r.count;
  }

  const totalWeight = (dist: Record<string, number>) =>
    Object.entries(dist).reduce((sum, [s, c]) => sum + satisfactionScore(s as Satisfaction) * c, 0);

  const meals = MEAL_TYPES.map((meal) => {
    const dist = byMeal[meal];
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    const weighted = totalWeight(dist);
    const bad = (dist.BAD ?? 0) + (dist.VERY_BAD ?? 0);
    return {
      meal,
      distribution: dist,
      total,
      avg: total > 0 ? Math.round(weighted / total) : null,
      badPct: total > 0 ? Math.round((bad / total) * 100) : 0,
    };
  });

  return ok({ date: today, meals, totalReviews: rows.length });
}

export const GET = withAuthorization(handleGet);
