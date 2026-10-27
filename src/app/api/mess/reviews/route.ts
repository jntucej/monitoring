import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { getIstDateString } from "@/server/policy/dates";
import type { AuthContext } from "@/lib/authContext";
import { MEAL_TYPES, SATISFACTION_LEVELS, type MealType, type Satisfaction } from "@/lib/mess-reviews";
import { isCleanComment } from "@/lib/profanity";

const IN_CHARGE = new Set(["mess_incharge", "admin", "sysadmin"]);
const MEAL_SET = new Set(MEAL_TYPES);
const SAT_SET = new Set(SATISFACTION_LEVELS.map((s) => s.value));
const REVIEW_WINDOW_DAYS = 2;

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const meal = url.searchParams.get("meal");
  const isManager = IN_CHARGE.has(auth.role);
  const params: unknown[] = [];
  const where = [`r.deleted_at IS NULL`];
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
           r.created_at, r.updated_at, r.edit_count
      FROM public.mess_meal_reviews r
      JOIN public.users u ON u.id = r.user_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY r.review_date DESC, r.meal_type ASC
     LIMIT 500`;
  const { rows } = await query(sql, params);
  return ok({ reviews: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  // R2: CSRF protection on the mutation.
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

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

  // R11: keep the comment box constructive. The check is substring-based and
  // case-insensitive; only blocks on a hit, never rewrites.
  const profanity = comment ? isCleanComment(comment) : null;
  if (profanity && !profanity.clean) {
    return fail(
      "COMMENT_FLAGGED",
      "Please keep your feedback constructive.",
      422,
    );
  }

  const today = getIstDateString();
  const minDate = getIstDateString(new Date(Date.now() - REVIEW_WINDOW_DAYS * 86_400_000));
  if (reviewDate > today)
    return fail("VALIDATION_ERROR", "Cannot review a future date", 400);
  // R3: only allow today or yesterday (REVIEW_WINDOW_DAYS=2).
  if (reviewDate < minDate)
    return fail("REVIEW_WINDOW_CLOSED", "You can only rate today's or yesterday's meals", 422);

  // R1: the student must have actually been served this meal (mess_meal_served
  // is populated by POST /api/mess/serve). Mess-incharge/admin bypass the
  // check — they are auditing/adjusting on a student's behalf.
  const isStudent = auth.role === "student";
  if (isStudent) {
    const { rows: served } = await query<{ served_at: string }>(
      `SELECT mss.served_at
         FROM public.mess_meal_served mss
         JOIN public.mess_days d ON d.id = mss.mess_day_id
        WHERE mss.user_id = $1
          AND d.meal_date = $2::date
          AND d.meal_type = $3
        ORDER BY mss.served_at DESC
        LIMIT 1`,
      [auth.userId, reviewDate, mealType],
    );
    if (!served[0]) {
      return fail("NOT_SERVED", "We have no record of you being served this meal", 422);
    }
  }

  // R8: a student on approved home_out leave on that date was not on campus,
  // so they cannot have been served the meal. Block the review.
  if (isStudent) {
    const { rows: onLeave } = await query<{ id: string }>(
      `SELECT 1
         FROM public.permissions
        WHERE requester_user_id = $1
          AND workflow_type = 'hostel'
          AND reason = 'home_out'
          AND status IN ('COMPLETED','APPROVED')
          AND from_date::date <= $2::date
          AND to_date::date   >= $2::date
        LIMIT 1`,
      [auth.userId, reviewDate],
    );
    if (onLeave[0]) {
      return fail("ON_APPROVED_LEAVE", "You were on approved leave this day", 422);
    }
  }

  const { rows } = await query(
    `INSERT INTO public.mess_meal_reviews (user_id, review_date, meal_type, satisfaction, comment, served_at_gate_check)
     VALUES ($1, $2::date, $3, $4, $5, NOW())
     ON CONFLICT (user_id, review_date, meal_type)
     DO UPDATE SET satisfaction = EXCLUDED.satisfaction,
                   comment      = EXCLUDED.comment,
                   edited_at    = NOW(),
                   edit_count   = public.mess_meal_reviews.edit_count + 1,
                   updated_at   = NOW()
     RETURNING id, review_date, meal_type, satisfaction, comment, created_at, updated_at`,
    [auth.userId, reviewDate, mealType, satisfaction, comment],
  );
  await addAudit({
    action: "MESS_REVIEW_SUBMITTED",
    userId: auth.userId,
    role: auth.role,
    details: { reviewDate, mealType, satisfaction, verified: !isStudent ? "staff" : "served" },
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
