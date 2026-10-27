import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/mess/inventory
 *
 * Active menu-item catalog stock state for the Mess In-charge:
 * every active mess_menu_item with its global availability, plus the
 * count of mess days it is currently scheduled on.
 */
async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  try {
    const res = await query(
      `SELECT mi.id, mi.code, mi.label, mi.sort_order AS sortOrder,
              mi.is_primary AS isPrimary,
              (SELECT COUNT(*)::int FROM mess_day_items mdi
                WHERE mdi.menu_item_id = mi.id AND mdi.is_available = TRUE) AS scheduledDays
         FROM mess_menu_items mi
        WHERE mi.is_active = TRUE
        ORDER BY mi.sort_order ASC`
    );

    const rows = res.rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      label: r.label,
      sortOrder: r.sortOrder ?? 0,
      isPrimary: r.isPrimary,
      scheduledDays: r.scheduledDays ?? 0,
    }));

    return ok({
      items: rows,
      primaryCount: rows.filter((r) => r.isPrimary).length,
      total: rows.length,
    });
  } catch (err) {
    console.error("[mess/inventory GET]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load inventory" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: TIER.MESS_INCHARGE }),
  { keyPrefix: "mess_inventory_get" }
);
