import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { publishNotification } from "@/lib/notifications/bus";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const circularId = parts[parts.length - 2];

  const { rows: cRows } = await query<{ id: string; title: string; feed_item_id: string | null }>(
    `SELECT id, title, feed_item_id FROM public.circular_requests WHERE id = $1::uuid LIMIT 1`,
    [circularId],
  );
  const circ = cRows[0];
  if (!circ || !circ.feed_item_id) {
    return fail("NOT_FOUND", "Published circular not found", 404);
  }

  const { rows: pending } = await query<{ user_id: string }>(
    `SELECT user_id FROM public.campus_feed_receipts
      WHERE feed_id = $1::uuid AND noted_at IS NULL
      LIMIT 200`,
    [circ.feed_item_id],
  );

  for (const p of pending) {
    await publishNotification({
      eventType: "circular.reminder",
      actorId: auth.userId,
      actorRole: auth.role,
      scope: `user:${p.user_id}`,
      title: `Reminder: ${circ.title}`,
      message: "Please review and mark this circular as Noted.",
      payload: { circular_id: circularId },
      priority: "high",
      channels: ["in_app"],
    }).catch(() => {});
  }

  return ok({ reminded: pending.length });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["faculty", "hod", "hostel_manager", "vice_principal", "principal", "admin", "sysadmin"],
});
