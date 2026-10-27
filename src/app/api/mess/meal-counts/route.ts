import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { getDayById, getNextActiveDay } from "../_helpers";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/mess/meal-counts?dayId=<uuid>
 *
 * Daily meal counts for the Mess In-charge: total preferences declared
 * (will_be_present), confirmed servings, veg/non-veg split, and
 * no-shows — for the requested day or the next active mess day.
 */
async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  try {
    const dayIdParam = req.nextUrl.searchParams.get("dayId");
    const day = dayIdParam ? await getDayById(dayIdParam) : await getNextActiveDay();
    if (!day) return fail("DAY_NOT_FOUND", "No mess day found", 404);

    const res = await query(
      `SELECT COUNT(*)::int AS total,
              SUM(CASE WHEN p.will_be_present = TRUE THEN 1 ELSE 0 END)::int AS declaredPresent,
              SUM(CASE WHEN p.primary_item = 'VEG' THEN 1 ELSE 0 END)::int AS veg,
              SUM(CASE WHEN p.primary_item = 'NON_VEG' THEN 1 ELSE 0 END)::int AS nonVeg,
              SUM(CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END)::int AS confirmed,
              SUM(CASE WHEN p.will_be_present = TRUE AND s.id IS NULL THEN 1 ELSE 0 END)::int AS noShows
         FROM mess_preferences p
         LEFT JOIN mess_meal_served s
           ON s.mess_day_id = p.mess_day_id AND s.user_id::text = p.user_id::text
        WHERE p.mess_day_id::text = $1`,
      [day.id]
    );

    const r: any = res.rows[0];
    return ok({
      messDayId: day.id,
      mealDate: day.meal_date,
      total: r?.total ?? 0,
      declaredPresent: r?.declaredPresent ?? 0,
      veg: r?.veg ?? 0,
      nonVeg: r?.nonVeg ?? 0,
      confirmed: r?.confirmed ?? 0,
      noShows: r?.noShows ?? 0,
    });
  } catch (err) {
    console.error("[mess/meal-counts GET]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load meal counts" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: TIER.MESS_INCHARGE }),
  { keyPrefix: "mess_meal_counts_get" }
);
