// src/app/api/mess/menu/[id]/publish/route.ts
// POST — mess-incharge publishes a weekly menu and fires ONE bus
// notification (event_type='mess.menu.published', scope 'mess', in-app only).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { publishNotification } from "@/lib/notifications/bus";
import type { AuthContext } from "@/lib/authContext";

const STAFF = new Set(["mess_incharge", "admin", "sysadmin"]);

function getMenuId(req: NextRequest): string {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  // /api/mess/menu/<id>/publish  → the id is the segment before 'publish'.
  return segs[segs.length - 2] ?? "";
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (!STAFF.has(auth.role)) return fail("FORBIDDEN", "Not allowed", 403);
  const menuId = getMenuId(req);
  if (!menuId) return fail("VALIDATION_ERROR", "menu id required", 400);

  const { rows: menus } = await query<{ status: string; week_start: string }>(
    `SELECT status, week_start FROM public.mess_menus WHERE id = $1`,
    [menuId]
  );
  if (menus.length === 0) return fail("NOT_FOUND", "menu not found", 404);
  if (menus[0].status !== "draft") {
    return fail("BAD_STATE", "only draft menus can be published", 409);
  }

  await query(
    `UPDATE public.mess_menus
        SET status = 'published', published_by = $1, published_at = now()
      WHERE id = $2`,
    [auth.userId, menuId]
  );
  await query(
    `UPDATE public.mess_weekly_items
        SET status = 'published'
      WHERE menu_id = $1 AND status IN ('draft','approved')`,
    [menuId]
  );

  await addAudit({
    action: "MESS_MENU_PUBLISHED",
    userId: auth.userId,
    role: auth.role,
    details: { menuId, weekStart: menus[0].week_start },
  });

  const notified = await publishNotification({
    eventType: "mess.menu.published",
    scope: "mess",
    payload: { menu_id: menuId, week_start: menus[0].week_start },
    channels: ["in_app"],
    priority: "normal",
    actorRole: auth.role,
    actorId: auth.userId,
  });

  return ok({ published: true, notified });
}

export const POST = withAuthorization(handlePost);
