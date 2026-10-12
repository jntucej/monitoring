import { NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

const VALID_PRIMARY_ITEMS = ["VEG", "NON_VEG"];

async function handleGet(_req: any, { auth }: { auth: AuthContext }) {
  try {
    const res = await query(
      `SELECT primary_item AS primaryItem, sub_item_ids AS subItemIds, updated_at AS updatedAt
         FROM mess_default_preferences
        WHERE user_id::text = $1`,
      [auth.userId]
    );
    const row: any = res.rows[0];
    let subItemIds: string[] = row?.subItemIds ?? [];
    if (typeof subItemIds === "string") {
      try { subItemIds = JSON.parse(subItemIds); } catch { subItemIds = []; }
    }
    return ok(
      row
        ? { primaryItem: row.primaryItem, subItemIds, updatedAt: row.updatedAt }
        : null
    );
  } catch (err) {
    console.error("[mess/default GET]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load default preference" } },
      { status: 500 }
    );
  }
}

async function handlePut(req: any, { auth }: { auth: AuthContext }) {
  try {
    const body = await req.json().catch(() => null);
    const { primaryItem, subItemIds } = body ?? {};

    if (!VALID_PRIMARY_ITEMS.includes(primaryItem)) {
      return fail("INVALID_PRIMARY_ITEM", "primaryItem must be VEG or NON_VEG", 400);
    }
    const ids = Array.isArray(subItemIds) ? subItemIds.filter((s) => typeof s === "string") : [];

    // Sub items (if any) must be valid catalog entries.
    if (ids.length > 0) {
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
      const check = await query(
        `SELECT id FROM mess_menu_items WHERE is_active = TRUE AND id IN (${placeholders})`,
        ids
      );
      const found = new Set(check.rows.map((r: any) => r.id));
      for (const sid of ids) {
        if (!found.has(sid)) return fail("INVALID_SUB_ITEM", `Unknown menu item ${sid}`, 400);
      }
    }

    await query(
      `INSERT INTO mess_default_preferences (user_id, primary_item, sub_item_ids, updated_at)
       VALUES ($1::uuid, $2, $3::uuid[], NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET primary_item = EXCLUDED.primary_item,
                    sub_item_ids = EXCLUDED.sub_item_ids,
                    updated_at = NOW()`,
      [auth.userId, primaryItem, ids]
    );

    await addAudit({
      action: "MESS_DEFAULT_SAVED",
      userId: auth.userId,
      role: "student",
      details: { primaryItem, subItemIds: ids },
    });

    return ok({ primaryItem, subItemIds: ids });
  } catch (err) {
    console.error("[mess/default PUT]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save default preference" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(async (req, ctx) => handleGet(req, ctx), { requiredRole: ["student"] }),
  { keyPrefix: "mess_default_get" }
);

export const PUT = withRateLimit(
  withAuthorization(async (req, ctx) => handlePut(req, ctx), { requiredRole: ["student"] }),
  { keyPrefix: "mess_default_put", maxRequests: 20 }
);
