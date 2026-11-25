// POST /api/mess/menu-items/[id]/interest-poll — open an interest poll for a
// new weekly menu item. Fires 'mess.poll.opened' to the poll's target scope.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { publishNotification } from "@/lib/notifications/bus";
import type { AuthContext } from "@/lib/authContext";

function ids(req: NextRequest): string {
  const s = new URL(req.url).pathname.split("/").filter(Boolean);
  return s[s.length - 2] ?? "";
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  if (!["mess_incharge", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }
  const weeklyItemId = ids(req);
  const body = (await req.json().catch(() => ({}))) as {
    closes_at?: string; min_interest_pct?: number; target_scope?: string;
  };
  if (!body.closes_at) return fail("VALIDATION_ERROR", "closes_at required", 400);

  // Load the weekly item (must be a new item).
  const { rows } = await query<{ is_new: boolean; item_name: string }>(
    `SELECT wi.is_new, cat.item_name
       FROM public.mess_weekly_items wi
       JOIN public.mess_menu_items cat ON cat.id = wi.catalog_item_id
      WHERE wi.id = $1`,
    [weeklyItemId]
  );
  if (rows.length === 0) return fail("NOT_FOUND", "menu item not found", 404);

  const { rows: pollRows } = await query<{ id: string }>(
    `INSERT INTO public.mess_item_interest_polls
       (weekly_item_id, closes_at, min_interest_pct, target_scope)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [weeklyItemId, body.closes_at, body.min_interest_pct ?? 0.6, body.target_scope ?? "mess"]
  );

  await addAudit({
    action: "MESS_POLL_OPENED",
    userId: auth.userId,
    role: auth.role,
    details: { weeklyItemId, pollId: pollRows[0].id },
  });

  const notified = await publishNotification({
    eventType: "mess.poll.opened",
    scope: body.target_scope ?? "mess",
    payload: { item_name: rows[0].item_name, poll_id: pollRows[0].id, closes_at: body.closes_at },
    channels: ["in_app", "sms"],
    priority: "normal",
    actorRole: auth.role,
  });

  return ok({ poll_id: pollRows[0].id, notified });
}

export const POST = withAuthorization(handlePost);
