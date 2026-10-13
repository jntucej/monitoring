import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { getDayById, getNextActiveDay } from "../_helpers";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/mess/attendance?dayId=<uuid>
 *
 * Meal attendance for the Mess In-charge: per-hostel-block declared vs
 * confirmed attendance for the requested day or the next active mess day.
 */
async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  try {
    const dayIdParam = req.nextUrl.searchParams.get("dayId");
    const day = dayIdParam ? await getDayById(dayIdParam) : await getNextActiveDay();
    if (!day) return fail("DAY_NOT_FOUND", "No mess day found", 404);

    const res = await query(
      `SELECT COALESCE(p.hostel_block, 'UNKNOWN') AS hostelBlock,
              COUNT(*)::int AS declared,
              SUM(CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END)::int AS confirmed,
              SUM(CASE WHEN p.primary_item = 'VEG' THEN 1 ELSE 0 END)::int AS veg,
              SUM(CASE WHEN p.primary_item = 'NON_VEG' THEN 1 ELSE 0 END)::int AS nonVeg
         FROM mess_preferences p
         LEFT JOIN mess_meal_served s
           ON s.mess_day_id = p.mess_day_id AND s.user_id::text = p.user_id::text
        WHERE p.mess_day_id::text = $1
          AND p.will_be_present = TRUE
        GROUP BY COALESCE(p.hostel_block, 'UNKNOWN')
        ORDER BY hostelBlock`,
      [day.id]
    );

    const rows = res.rows.map((r: any) => ({
      hostelBlock: r.hostelBlock,
      declared: r.declared ?? 0,
      confirmed: r.confirmed ?? 0,
      veg: r.veg ?? 0,
      nonVeg: r.nonVeg ?? 0,
      attendanceRate: (r.declared ?? 0) > 0 ? Math.round(((r.confirmed ?? 0) / (r.declared ?? 0)) * 100) : 0,
    }));

    const totals = rows.reduce(
      (acc, r) => ({
        declared: acc.declared + r.declared,
        confirmed: acc.confirmed + r.confirmed,
        veg: acc.veg + r.veg,
        nonVeg: acc.nonVeg + r.nonVeg,
        attendanceRate: 0,
      }),
      { declared: 0, confirmed: 0, veg: 0, nonVeg: 0, attendanceRate: 0 }
    );
    totals.attendanceRate = totals.declared > 0 ? Math.round((totals.confirmed / totals.declared) * 100) : 0;

    return ok({ messDayId: day.id, mealDate: day.meal_date, byHostelBlock: rows, totals });
  } catch (err) {
    console.error("[mess/attendance GET]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load meal attendance" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: TIER.MESS_INCHARGE }),
  { keyPrefix: "mess_attendance_get" }
);
