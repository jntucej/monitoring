// GET /api/mess/menus?week_start=YYYY-MM-DD — read a weekly menu (mess_menus +
// its mess_weekly_items, joined to the catalog for item names). Draft menus
// are only visible to mess_incharge/admin; everyone else sees published.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const url = new URL(req.url);
  const weekStart = url.searchParams.get("week_start");
  const canSeeDraft = ["mess_incharge", "admin", "sysadmin", "hostel_manager"].includes(auth.role);

  const { rows } = await query<Record<string, unknown>>(
    `SELECT id, week_start, version, status
       FROM public.mess_menus
      WHERE ($1::date IS NULL OR week_start = $1::date)
        AND ($2 OR status = 'published')
      ORDER BY week_start DESC, version DESC
      LIMIT 1`,
    [weekStart, canSeeDraft]
  );
  if (rows.length === 0) return fail("NOT_FOUND", "no menu for that week", 404);
  const menu = rows[0];

  const { rows: items } = await query<Record<string, unknown>>(
    `SELECT wi.id,
            wi.catalog_item_id,
            wi.day_of_week,
            wi.meal_type,
            wi.is_new,
            wi.status,
            cat.label AS item_name,
            cat.code  AS item_code
       FROM public.mess_weekly_items wi
       JOIN public.mess_menu_items cat ON cat.id = wi.catalog_item_id
      WHERE wi.menu_id = $1
      ORDER BY wi.day_of_week, wi.meal_type`,
    [menu.id]
  );

  return ok({
    id: menu.id,
    week_start: menu.week_start,
    version: menu.version,
    status: menu.status,
    items,
  });
}

export const GET = withAuthorization(handleGet);
