import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withAdminMutation } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }) {
  try {
    const res = await query(
      `SELECT d.id, d.meal_date AS mealDate, d.meal_type AS mealType,
              d.day_type AS dayType, d.window_opens_at AS windowOpensAt,
              d.window_closes_at AS windowClosesAt, d.tokens_locked_at AS tokensLockedAt,
              d.tokens_revoked_at AS tokensRevokedAt, d.is_active AS isActive,
              (SELECT COUNT(*)::int FROM mess_day_items mdi WHERE mdi.mess_day_id = d.id) AS itemCount,
              (SELECT COUNT(*)::int FROM mess_preferences p WHERE p.mess_day_id = d.id) AS selections
         FROM mess_days d
        ORDER BY d.meal_date DESC
        LIMIT 60`
    );
    return ok({ days: res.rows });
  } catch (err) {
    console.error("[mess/days GET]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to list mess days" } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const body = await req.json().catch(() => null);
    const mealDate: string = (body?.mealDate ?? "").toString().trim();
    const dayType: string = (body?.dayType ?? "WEEKDAY").toString().trim();
    const windowOpens: string | null =
      typeof body?.windowOpens === "string" && body.windowOpens.trim() ? body.windowOpens.trim() : null;
    const windowCloses: string | null =
      typeof body?.windowCloses === "string" && body.windowCloses.trim() ? body.windowCloses.trim() : null;
    const items: unknown[] = Array.isArray(body?.items) ? body.items : [];

    if (!mealDate || isNaN(Date.parse(mealDate))) {
      return fail("INVALID_MEAL_DATE", "mealDate is required and must be a valid date", 400);
    }

    const menuItemIds = items.filter((v) => typeof v === "string");
    const itemIds: string[] = menuItemIds;
    if (menuItemIds.length > 0) {
      const placeholders = menuItemIds.map((_, i) => `$${i + 1}`).join(", ");
      const check = await query(
        `SELECT id FROM mess_menu_items WHERE is_active = TRUE AND id IN (${placeholders})`,
        menuItemIds
      );
      const found = new Set(check.rows.map((r: any) => r.id));
      for (const iid of menuItemIds) {
        if (!found.has(iid)) {
          return fail("UNKNOWN_MENU_ITEM", `Menu item ${iid} not found or inactive`, 400);
        }
      }
    }

    const inserted = await query(
      `INSERT INTO mess_days (meal_date, meal_type, day_type, window_opens_at, window_closes_at, is_active)
       VALUES ($1::date, 'MIXED', $2, $3::timestamptz, $4::timestamptz, TRUE)
       RETURNING id`,
      [mealDate, dayType, windowOpens, windowCloses]
    );
    const dayId: string = inserted.rows[0].id;

    if (itemIds.length > 0) {
      for (const iid of itemIds) {
        await query(
          `INSERT INTO mess_day_items (mess_day_id, menu_item_id, is_available)
           VALUES ($1::uuid, $2::uuid, TRUE)`,
          [dayId, iid]
        );
      }
    }

    await addAudit({
      action: "MESS_DAY_CREATED",
      userId: auth.userId,
      role: auth.role,
      details: { dayId, mealDate, dayType, windowOpens, windowCloses, items: itemIds },
    });

    return ok({ id: dayId, mealDate, dayType, windowOpens, windowCloses, items: itemIds }, 201);
  } catch (err) {
    console.error("[mess/days POST]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create mess day" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(async (req, ctx) => handleGet(req, ctx), { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "mess_days_get" }
);

export const POST = withAdminMutation(handlePost, {
  rateLimit: { windowMs: 60_000, maxRequests: 20 },
});
