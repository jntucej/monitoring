import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/mess/consumption?days=14
 *
 * Consumption report for the Mess In-charge: per-mess-day serving totals,
 * by primary item, by serving method, and the latest 14 days' trend.
 */
async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  try {
    const daysParam = req.nextUrl.searchParams.get("days");
    const days = daysParam ? Math.min(30, Math.max(1, Number(daysParam))) : 14;

    const res = await query(
      `SELECT d.id AS messDayId,
              d.meal_date AS mealDate,
              d.meal_type AS mealType,
              d.is_active AS isActive,
              COUNT(DISTINCT s.id)::int AS servedTotal,
              SUM(CASE WHEN s.method = 'TOKEN_SCAN' THEN 1 ELSE 0 END)::int AS viaToken,
              SUM(CASE WHEN s.method = 'MANUAL' THEN 1 ELSE 0 END)::int AS viaManual,
              SUM(CASE WHEN t.primary_item = 'VEG' THEN 1 ELSE 0 END)::int AS veg,
              SUM(CASE WHEN t.primary_item = 'NON_VEG' THEN 1 ELSE 0 END)::int AS nonVeg,
              MIN(s.served_at) AS firstServedAt,
              MAX(s.served_at) AS lastServedAt
         FROM mess_days d
         LEFT JOIN mess_meal_served s ON s.mess_day_id = d.id
         LEFT JOIN mess_tokens t ON t.id = s.token_id
        WHERE d.meal_date >= CURRENT_DATE - ($1 || ' days')::interval
        GROUP BY d.id, d.meal_date, d.meal_type, d.is_active
        ORDER BY d.meal_date DESC
        LIMIT $1`,
      [days]
    );

    const rows = res.rows.map((r: any) => ({
      messDayId: r.messDayId,
      mealDate: r.mealDate,
      mealType: r.mealType,
      isActive: r.isActive,
      servedTotal: r.servedTotal ?? 0,
      viaToken: r.viaToken ?? 0,
      viaManual: r.viaManual ?? 0,
      veg: r.veg ?? 0,
      nonVeg: r.nonVeg ?? 0,
      firstServedAt: r.firstServedAt ?? null,
      lastServedAt: r.lastServedAt ?? null,
    }));

    const trend = rows.filter((r) => r.servedTotal > 0);
    const totals = rows.reduce(
      (acc, r) => ({
        served: acc.served + r.servedTotal,
        viaToken: acc.viaToken + r.viaToken,
        viaManual: acc.viaManual + r.viaManual,
        veg: acc.veg + r.veg,
        nonVeg: acc.nonVeg + r.nonVeg,
      }),
      { served: 0, viaToken: 0, viaManual: 0, veg: 0, nonVeg: 0 }
    );

    return ok({
      days,
      trend,
      totals,
      avgPerDay: trend.length > 0 ? Math.round(totals.served / trend.length) : 0,
    });
  } catch (err) {
    console.error("[mess/consumption GET]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load consumption report" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: TIER.MESS_INCHARGE }),
  { keyPrefix: "mess_consumption_get" }
);
