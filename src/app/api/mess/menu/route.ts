import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { query } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { getNextActiveDay, getMyStudentDetails } from "../_helpers";
import type { AuthContext } from "@/lib/authContext";
import type { StudentType } from "@/lib/types";

async function handleGet(req: any, { auth }: { auth: AuthContext }) {
  try {
    const day = await getNextActiveDay();
    if (!day) return ok({ mealDate: null, windowOpens: null, windowCloses: null, items: [] });

    // Determine which student types the items apply to: for students, scope by
    // their own eligibility type; admins/mess staff see all items for the day.
    let applicableTypes: StudentType[] | null = null;
    if (auth.role === "student") {
      const me = await getMyStudentDetails(auth.userId);
      if (me) {
        if (me.studentType) applicableTypes = [me.studentType as StudentType];
        else if (me.hostelBlock) applicableTypes = ["HM", "HF"];
      }
    }

    let itemsQuery: string;
    const params: any[] = [];
    if (applicableTypes && applicableTypes.length > 0) {
      params.push(day.id, JSON.stringify(applicableTypes));
      itemsQuery = `SELECT mi.id, mi.code, mi.label, mi.sort_order,
                           COALESCE(mdi.is_available, TRUE) AS is_available,
                           COALESCE(mdi.is_available, TRUE) AS isAvailable
                      FROM mess_menu_items mi
                      LEFT JOIN mess_day_items mdi
                        ON mdi.menu_item_id = mi.id AND mdi.mess_day_id::text = $1
                      LEFT JOIN mess_menu_applicability ma
                        ON ma.menu_item_id = mi.id
                       AND ma.applicable_to = ANY($2::text[])
                     WHERE mi.is_active = TRUE
                       AND (mdi.id IS NOT NULL OR ma.id IS NOT NULL)
                     ORDER BY mi.sort_order ASC`;
    } else {
      params.push(day.id);
      itemsQuery = `SELECT mi.id, mi.code, mi.label, mi.sort_order,
                           COALESCE(mdi.is_available, TRUE) AS is_available
                      FROM mess_menu_items mi
                      LEFT JOIN mess_day_items mdi
                        ON mdi.menu_item_id = mi.id AND mdi.mess_day_id::text = $1
                     WHERE mi.is_active = TRUE
                     ORDER BY mi.sort_order ASC`;
    }

    const itemsRes = await query(itemsQuery, params);
    const items = itemsRes.rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      label: r.label,
      sortOrder: r.sort_order,
      isAvailable: r.is_available !== false,
    }));

    return ok({
      mealDate: day.meal_date,
      windowOpens: day.window_opens_at,
      windowCloses: day.window_closes_at,
      messDayId: day.id,
      items,
    });
  } catch (err) {
    console.error("[mess/menu GET]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load menu" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(async (req, ctx) => handleGet(req, ctx), {
    requiredRole: ["student", "admin", "sysadmin", "mess_incharge"],
  }),
  { keyPrefix: "mess_menu_get" }
);
