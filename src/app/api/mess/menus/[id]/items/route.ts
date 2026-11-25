// POST /api/mess/menus/[id]/items — schedule a catalog dish into a weekly
// menu (mess_weekly_items). Draft menus only. Body:
//   { catalog_item_id, day_of_week, meal_type, is_new?, allergens?[] }
//
// This is the planning step: it does NOT publish the week. Publishing is a
// separate POST /api/mess/menu/[id]/publish.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

const STAFF = new Set(["mess_incharge", "admin", "sysadmin"]);

function menuId(req: NextRequest): string {
  const s = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = s.indexOf("menus");
  return idx >= 0 ? s[idx + 1] ?? "" : "";
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  if (!STAFF.has(auth.role)) return fail("FORBIDDEN", "Not allowed", 403);

  const id = menuId(req);
  if (!id) return fail("VALIDATION_ERROR", "menu id required", 400);
  const body = (await req.json().catch(() => ({}))) as {
    catalog_item_id?: string; day_of_week?: number; meal_type?: string;
    is_new?: boolean; allergens?: string[];
  };
  if (!body.catalog_item_id || !body.day_of_week || !body.meal_type) {
    return fail("VALIDATION_ERROR", "catalog_item_id, day_of_week and meal_type required", 400);
  }

  const { rows: menus } = await query<{ status: string }>(
    `SELECT status FROM public.mess_menus WHERE id = $1`,
    [id]
  );
  if (menus.length === 0) return fail("NOT_FOUND", "menu not found", 404);
  if (menus[0].status !== "draft") return fail("BAD_STATE", "only draft menus accept items", 409);

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.mess_weekly_items
       (menu_id, catalog_item_id, day_of_week, meal_type, category, allergens, is_new)
     VALUES ($1, $2, $3, $4, 'general', $5, $6)
     ON CONFLICT (menu_id, catalog_item_id, day_of_week, meal_type)
     DO UPDATE SET is_new = $6
     RETURNING id`,
    [id, body.catalog_item_id, body.day_of_week, body.meal_type,
     JSON.stringify(body.allergens ?? []), Boolean(body.is_new)]
  );

  await addAudit({
    action: "MESS_WEEKLY_ITEM_ADDED",
    userId: auth.userId,
    role: auth.role,
    details: { menuId: id, catalogItemId: body.catalog_item_id, day: body.day_of_week, meal: body.meal_type },
  });

  return ok({ added: true, weekly_item_id: rows[0].id });
}

export const POST = withAuthorization(handlePost);
