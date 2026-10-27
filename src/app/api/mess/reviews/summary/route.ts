import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { getIstDateString } from "@/server/policy/dates";
import type { AuthContext } from "@/lib/authContext";
import { MEAL_TYPES, SATISFACTION_LEVELS, type MealType, type Satisfaction, satisfactionScore } from "@/lib/mess-reviews";

const IN_CHARGE = new Set(["mess_incharge", "admin", "sysadmin"]);
// R9: anonymity is enforced at the API layer. The mess-incharge dashboard keeps
// identity hidden so negative feedback is more likely to be honest; only
// sysadmin / principal retain the name for moderation.
const IDENTITY_REVEAL = new Set(["sysadmin", "principal"]);

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!IN_CHARGE.has(auth.role)) return fail("FORBIDDEN", "Not allowed", 403);
  const url = new URL(req.url);
  const to = url.searchParams.get("to") ?? getIstDateString();
  const from = url.searchParams.get("from") ?? getIstDateString(new Date(Date.now() - 13 * 86_400_000));

  const { rows: dist } = await query<{
    review_date: string; meal_type: MealType; satisfaction: Satisfaction; count: number;
  }>(
    `SELECT review_date::text, meal_type, satisfaction, COUNT(*)::int AS count
       FROM public.mess_meal_reviews
      WHERE review_date BETWEEN $1::date AND $2::date
      GROUP BY review_date, meal_type, satisfaction
      ORDER BY review_date DESC, meal_type`,
    [from, to],
  );

  const byDayMeal = new Map<string, Record<Satisfaction, number>>();
  for (const r of dist) {
    const key = `${r.review_date}|${r.meal_type}`;
    const bucket = byDayMeal.get(key) ?? { VERY_GOOD: 0, GOOD: 0, AVERAGE: 0, BAD: 0, VERY_BAD: 0 };
    bucket[r.satisfaction] = Number(r.count);
    byDayMeal.set(key, bucket);
  }

  const daily = Array.from(byDayMeal.entries())
    .map(([key, bucket]) => {
      const [date, mealType] = key.split("|");
      const total = Object.values(bucket).reduce((a, b) => a + b, 0);
      const scoreSum = SATISFACTION_LEVELS.reduce(
        (acc, s) => acc + (bucket[s.value] ?? 0) * satisfactionScore(s.value),
        0,
      );
      return {
        date,
        mealType: mealType as MealType,
        distribution: bucket,
        total,
        averageScore: total ? Number((scoreSum / total).toFixed(2)) : 0,
      };
    })
    .sort((a, b) => (a.date === b.date ? a.mealType.localeCompare(b.mealType) : b.date.localeCompare(a.date)));

  const { rows: comments } = await query<{
    id: string; review_date: string; meal_type: MealType; satisfaction: Satisfaction;
    comment: string; user_name: string; unique_id: string; updated_at: string;
  }>(
    `SELECT r.id, r.review_date::text, r.meal_type, r.satisfaction, r.comment,
            u.name AS user_name, u.unique_id, r.updated_at
       FROM public.mess_meal_reviews r
       JOIN public.users u ON u.id = r.user_id
      WHERE r.comment IS NOT NULL AND r.comment <> ''
       AND r.review_date BETWEEN $1::date AND $2::date
      ORDER BY r.updated_at DESC
      LIMIT 50`,
    [from, to],
  );

  // R9: hide identity from the dashboard unless the caller can moderate.
  const revealIdentity = IDENTITY_REVEAL.has(auth.role);
  const recentComments = revealIdentity
    ? comments
    : comments.map(({ user_name, unique_id, ...rest }) => ({
        ...rest,
        user_name: "Anonymous",
        unique_id: "—",
      }));

  const totalsByMeal: Record<string, { total: number; averageScore: number }> = {};
  for (const meal of MEAL_TYPES) {
    const entries = daily.filter((d) => d.mealType === meal);
    const total = entries.reduce((a, b) => a + b.total, 0);
    const weighted = entries.reduce((a, b) => a + b.averageScore * b.total, 0);
    totalsByMeal[meal] = { total, averageScore: total ? Number((weighted / total).toFixed(2)) : 0 };
  }

  return ok({ from, to, daily, totalsByMeal, recentComments, anonymous: !revealIdentity });
}

export const GET = withAuthorization(
  withRateLimit(handleGet, { windowMs: 60_000, maxRequests: 120 }),
  {},
);
