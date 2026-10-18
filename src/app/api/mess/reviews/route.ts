import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { getIstDateString } from "@/server/policy/dates";
import type { AuthContext } from "@/lib/authContext";
import { MEAL_TYPES, SATISFACTION_LEVELS, type MealType, type Satisfaction } from "@/lib/mess-reviews";

const IN_CHARGE = new Set(["mess_incharge", "admin", "sysadmin"]);
const MEAL_SET = new Set(MEAL_TYPES);
const SAT_SET = new Set(SATISFACTION_LEVELS.map((s) => s.value));
const REVIEW_WINDOW_DAYS = 7;

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const meal = url.searchParams.get("meal");
  const isManager = IN_CHARGE.has(auth.role);
  const params: unknown[] = [];
  const where: string[] = [];
  if (!isManager) {
    params.push(auth.userId);
    where.push(`r.user_id = $${params.length}`);
  }
  if (from) { params.push(from); where.push(`r.review_date >= $${params.length}::date`); }
  if (to)   { params.push(to);   where.push(`r.review_date <= $${params.length}::date`); }
  if (meal && MEAL_SET.has(meal as MealType)) {
    params.push(meal); where.push(`r.meal_type = $${params.length}`);
  }
  const sql = `
    SELECT r.id, r.user_id, u.name AS user_name, u.unique_id,
           r.review_date, r.meal_type, r.satisfaction, r.comment,
           r.created_at, r.updated_at
      FROM public.mess_meal_reviews r
      JOIN public.users u ON u.id = r.user_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY r.review_date DESC, r.meal_type ASC
     LIMIT 500`;
  const { rows } = await query(sql, params);
  return ok({ reviews: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["student", "mess_incharge", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }
  const body = (await req.json().catch(() => null)) as
    | { reviewDate?: unknown; mealType?: unknown; satisfaction?: unknown; comment?: unknown }
    | null;
  const reviewDate = String(body?.reviewDate ?? "");
  const mealType = String(body?.mealType ?? "").toUpperCase() as MealType;
  const satisfaction = String(body?.satisfaction ?? "").toUpperCase() as Satisfaction;
  const comment = body?.comment == null ? null : String(body.comment).slice(0, 280);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewDate))
    return fail("VALIDATION_ERROR", "reviewDate must be YYYY-MM-DD", 400);
  if (!MEAL_SET.has(mealType))
    return fail("VALIDATION_ERROR", "mealType must be BREAKFAST|LUNCH|DINNER", 400);
  if (!SAT_SET.has(satisfaction))
    return fail("VALIDATION_ERROR", "Invalid satisfaction level", 400);

  const today = getIstDateString();
  const minDate = getIstDateString(new Date(Date.now() - REVIEW_WINDOW_DAYS * 86_400_000));
  if (reviewDate > today)
    return fail("VALIDATION_ERROR", "Cannot review a future date", 400);
  if (reviewDate < minDate)
    return fail("VALIDATION_ERROR", `Reviews only allowed for the last ${REVIEW_WINDOW_DAYS} days`, 400);

  const { rows } = await query(
    `INSERT INTO public.mess_meal_reviews (user_id, review_date, meal_type, satisfaction, comment)
     VALUES ($1, $2::date, $3, $4, $5)
     ON CONFLICT (user_id, review_date, meal_type)
     DO UPDATE SET satisfaction = EXCLUDED.satisfaction,
                   comment      = EXCLUDED.comment,
                   updated_at   = NOW()
     RETURNING id, review_date, meal_type, satisfaction, comment, created_at, updated_at`,
    [auth.userId, reviewDate, mealType, satisfaction, comment],
  );
  await addAudit({
    action: "MESS_REVIEW_SUBMITTED",
    userId: auth.userId,
    role: auth.role,
    details: { reviewDate, mealType, satisfaction },
  });
  return ok({ review: rows[0] });
}

export const GET = withAuthorization(
  withRateLimit(handleGet, { windowMs: 60_000, maxRequests: 120 }),
  {},
);

export const POST = withAuthorization(
  withRateLimit(handlePost, { windowMs: 60_000, maxRequests: 60 }),
  {},
);
