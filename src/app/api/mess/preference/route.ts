import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { getMyStudentDetails, isMessEligible, getNextActiveDay, getDayById } from "../_helpers";
import type { AuthContext } from "@/lib/authContext";

const VALID_PRIMARY_ITEMS = ["VEG", "NON_VEG"];

async function handleGet(_req: Parameters<ReturnType<typeof withRateLimit>>[0], { auth }: { auth: AuthContext }) {
  try {
    const userId = auth.userId;

    const nextDay = await getNextActiveDay();

    const prefRes = await query(
      `SELECT p.mess_day_id, p.primary_item, p.will_be_present, p.hostel_block
         FROM mess_preferences p
        WHERE p.user_id::text = $1
          AND p.mess_day_id = $2`,
      [userId, nextDay?.id ?? "00000000-0000-0000-0000-000000000000"]
    );
    const prefRow: any = prefRes.rows[0] ?? null;

    let subItemIds: string[] = [];
    if (prefRow) {
      const prefLookup = await query(
        `SELECT id FROM mess_preferences WHERE user_id::text = $1 AND mess_day_id::text = $2`,
        [userId, prefRow.mess_day_id]
      );
      const prefId = prefLookup.rows[0]?.id;
      if (prefId) {
        const subRes = await query(
          `SELECT menu_item_id FROM mess_preference_sub_items WHERE preference_id::text = $1`,
          [prefId]
        );
        subItemIds = subRes.rows.map((r: any) => r.menu_item_id);
      }
    }

    let menuItems: Array<{ id: string; code: string; label: string; isAvailable: boolean }> = [];
    if (nextDay) {
      const dayItems = await query(
        `SELECT mi.id, mi.code, mi.label,
                COALESCE(mdi.is_available, TRUE) AS is_available
           FROM mess_menu_items mi
           LEFT JOIN mess_day_items mdi
             ON mdi.menu_item_id = mi.id AND mdi.mess_day_id::text = $1
          WHERE mi.is_active = TRUE
          ORDER BY mi.sort_order ASC`,
        [nextDay.id]
      );
      menuItems = dayItems.rows.map((r: any) => ({
        id: r.id,
        code: r.code,
        label: r.label,
        isAvailable: r.is_available !== false,
      }));
    }

    return ok({
      period: nextDay
        ? {
            messDayId: nextDay.id,
            mealDate: nextDay.meal_date,
            mealType: nextDay.meal_type,
            windowOpensAt: nextDay.window_opens_at,
            windowClosesAt: nextDay.window_closes_at,
            tokensLockedAt: nextDay.tokens_locked_at,
          }
        : null,
      myPreference: prefRow
        ? {
            messDayId: prefRow.mess_day_id,
            primaryItem: prefRow.primary_item,
            willBePresent: prefRow.will_be_present,
            hostelBlock: prefRow.hostel_block,
            subItemIds,
          }
        : null,
      menuItems,
    });
  } catch (err) {
    console.error("[mess/preference GET]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load mess preference" } },
      { status: 500 }
    );
  }
}

async function handlePost(req: any, { auth }: { auth: AuthContext }) {
  try {
    const userId = auth.userId;
    const body = await req.json().catch(() => null);
    const messDayId: string = body?.messDayId ?? "";
    const { primaryItem, willBePresent, subItemIds } = body ?? {};

    if (!messDayId) return fail("MISSING_PARAM", "messDayId is required", 400);
    if (!VALID_PRIMARY_ITEMS.includes(primaryItem)) {
      return fail("INVALID_PRIMARY_ITEM", "primaryItem must be VEG or NON_VEG", 400);
    }
    if (typeof willBePresent !== "boolean") {
      return fail("INVALID_FIELD", "willBePresent must be a boolean", 400);
    }

    const day = await getDayById(messDayId);
    if (!day) return fail("DAY_NOT_FOUND", "Mess day not found", 404);
    if (!day.is_active) return fail("DAY_INACTIVE", "This mess day is not open", 400);

    const nowIso = new Date().toISOString();
    const opensAt = day.window_opens_at ? new Date(day.window_opens_at).toISOString() : null;
    const closesAt = day.window_closes_at ? new Date(day.window_closes_at).toISOString() : null;
    if (opensAt && nowIso < opensAt) {
      return fail("WINDOW_NOT_OPEN", "Selection window has not opened yet", 400);
    }
    if (closesAt && nowIso > closesAt) {
      return fail("WINDOW_CLOSED", "Selection window has closed", 400);
    }

    const me = await getMyStudentDetails(userId);
    if (!me) return fail("STUDENT_NOT_FOUND", "No student profile found for this user", 403);
    if (!isMessEligible(me.studentType, me.hostelBlock)) {
      return fail("NOT_ELIGIBLE", "You are not eligible for mess meals", 403);
    }

    let finalSubIds: string[] = [];
    if (Array.isArray(subItemIds) && subItemIds.length > 0) {
      const ids = subItemIds.filter((s) => typeof s === "string");
      const placeholders = ids.map((_, i) => `$${i + 2}`).join(", ");
      const subCheck = await query(
        `SELECT mdi.menu_item_id
           FROM mess_day_items mdi
          WHERE mdi.mess_day_id::text = $1
            AND mdi.menu_item_id IN (${placeholders})
            AND (mdi.is_available = TRUE OR mdi.is_available IS NULL)`,
        [messDayId, ...ids]
      );
      const found = new Set(subCheck.rows.map((r: any) => r.menu_item_id));
      for (const sid of ids) {
        if (!found.has(sid)) {
          return fail("INVALID_SUB_ITEM", `Sub item ${sid} is not available for this day`, 400);
        }
      }
      finalSubIds = ids;
    }

    const block = me.hostelBlock;

    await query(
      `INSERT INTO mess_preferences (user_id, mess_day_id, primary_item, will_be_present, hostel_block)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5)
       ON CONFLICT (user_id, mess_day_id)
       DO UPDATE SET primary_item = EXCLUDED.primary_item,
                    will_be_present = EXCLUDED.will_be_present,
                    hostel_block = COALESCE(EXCLUDED.hostel_block, mess_preferences.hostel_block)`,
      [userId, messDayId, primaryItem, willBePresent, block]
    );

    const prefLookup = await query(
      `SELECT id FROM mess_preferences WHERE user_id::text = $1 AND mess_day_id::text = $2`,
      [userId, messDayId]
    );
    const prefId = prefLookup.rows[0]?.id;
    if (prefId) {
      await query(`DELETE FROM mess_preference_sub_items WHERE preference_id::text = $1`, [prefId]);
      if (finalSubIds.length > 0) {
        const values = finalSubIds.map((sid, i) => `($1::uuid, $${i + 2}::uuid)`).join(", ");
        await query(
          `INSERT INTO mess_preference_sub_items (preference_id, menu_item_id) VALUES ${values}`,
          [prefId, ...finalSubIds]
        );
      }
    }

    await query(
      `INSERT INTO mess_notifications_log
         (user_id, mess_day_id, event_type, channel, status, payload, sent_at)
       VALUES ($1::uuid, $2::uuid, 'PREFERENCE_SAVED', 'app', 'SENT', $3::jsonb, NOW())`,
      [userId, messDayId, JSON.stringify({ primaryItem, willBePresent, subItems: finalSubIds })]
    );

    await addAudit({
      action: "MESS_PREFERENCE_SAVED",
      userId,
      role: "student",
      details: { messDayId, primaryItem, willBePresent, subItems: finalSubIds },
    });

    return ok({ messDayId, primaryItem, willBePresent, subItemIds: finalSubIds });
  } catch (err) {
    console.error("[mess/preference POST]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save preference" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(async (req, ctx) => handleGet(req, ctx), { requiredRole: ["student", "admin", "sysadmin"] }),
  { keyPrefix: "mess_preference_get" }
);

export const POST = withRateLimit(
  withAuthorization(async (req, ctx) => handlePost(req, ctx), { requiredRole: ["student", "admin", "sysadmin"] }),
  { keyPrefix: "mess_preference_post", maxRequests: 20 }
);
