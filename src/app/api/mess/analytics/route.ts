import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { getDayById, getNextActiveDay } from "../_helpers";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const dayIdParam = req.nextUrl.searchParams.get("dayId");
    const day = dayIdParam ? await getDayById(dayIdParam) : await getNextActiveDay();
    if (!day) {
      // No active mess day: return a graceful empty payload instead of a
      // 404 so the console's mount-time poll doesn't surface a console
      // error. The UI shows "no data" rather than an error banner.
      return ok({
        messDayId: null,
        mealDate: null,
        totalHostellers: 0,
        selectedCount: 0,
        notSelected: 0,
        declaredPresent: 0,
        confirmedPresent: 0,
        byPrimary: { VEG: 0, NON_VEG: 0 },
        byHostelBlock: {},
      });
    }

    // Total eligible hostellers: students with a hostel block in student_details.
    const hostellersRes = await query(
      `SELECT COUNT(*)::int AS c
         FROM users u
         JOIN student_details sd ON sd.user_id::text = u.id::text
        WHERE u.role = 'student' AND sd.hostel_block IS NOT NULL`
    );
    const totalHostellers = hostellersRes.rows[0]?.c ?? 0;

    const countsRes = await query(
      `SELECT COALESCE(p.hostel_block, 'UNKNOWN') AS hostel_block,
              COUNT(*)::int AS total,
              SUM(CASE WHEN p.will_be_present = TRUE THEN 1 ELSE 0 END)::int AS declared_present,
              SUM(CASE WHEN p.will_be_present = TRUE AND s.id IS NOT NULL THEN 1 ELSE 0 END)::int AS confirmed_present,
              SUM(CASE WHEN p.primary_item = 'VEG' THEN 1 ELSE 0 END)::int AS veg,
              SUM(CASE WHEN p.primary_item = 'NON_VEG' THEN 1 ELSE 0 END)::int AS non_veg
         FROM mess_preferences p
         LEFT JOIN mess_meal_served s
           ON s.mess_day_id = p.mess_day_id AND s.user_id::text = p.user_id::text
        WHERE p.mess_day_id::text = $1
        GROUP BY p.hostel_block
        ORDER BY p.hostel_block`,
      [day.id]
    );

    const byHostelBlock: Record<string, { total: number; declaredPresent: number; confirmedPresent: number; veg: number; nonVeg: number }> = {};
    let totalVeg = 0;
    let totalNonVeg = 0;
    let totalDeclared = 0;
    let totalConfirmed = 0;
    let totalSelected = 0;

    for (const r of countsRes.rows as any[]) {
      byHostelBlock[r.hostel_block] = {
        total: r.total ?? 0,
        declaredPresent: r.declared_present ?? 0,
        confirmedPresent: r.confirmed_present ?? 0,
        veg: r.veg ?? 0,
        nonVeg: r.non_veg ?? 0,
      };
      totalVeg += r.veg ?? 0;
      totalNonVeg += r.non_veg ?? 0;
      totalDeclared += r.declared_present ?? 0;
      totalConfirmed += r.confirmed_present ?? 0;
      totalSelected += r.total ?? 0;
    }

    const byPrimary = { VEG: totalVeg, NON_VEG: totalNonVeg };

    return ok({
      messDayId: day.id,
      mealDate: day.meal_date,
      totalHostellers,
      selectedCount: totalSelected,
      notSelected: Math.max(0, totalHostellers - totalSelected),
      declaredPresent: totalDeclared,
      confirmedPresent: totalConfirmed,
      byPrimary,
      byHostelBlock,
    });
  } catch (err) {
    console.error("[mess/analytics GET]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load analytics" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(async (req, ctx) => handleGet(req, ctx), { requiredRole: TIER.MESS_INCHARGE }),
  { keyPrefix: "mess_analytics_get" }
);
