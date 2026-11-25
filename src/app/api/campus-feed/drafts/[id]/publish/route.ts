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
  const draftId = parts[parts.length - 2];
  const b = await req.json().catch(() => ({}));

  const { rows } = await query<{ id: string; title: string; target_scope: string; priority: string }>(
    `UPDATE public.campus_feed_items
        SET status = 'active',
            target_scope = COALESCE($2, target_scope),
            expires_at = COALESCE($3::timestamptz, expires_at),
            posted_at = NOW()
      WHERE id = $1::uuid AND status = 'draft'
      RETURNING id, title, target_scope, priority`,
    [draftId, b?.target_scope ?? null, b?.expires_at ?? null],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Draft not found", 404);

  await publishNotification({
    eventType: "campus_feed.published",
    actorId: auth.userId,
    actorRole: auth.role,
    scope: rows[0].target_scope,
    title: rows[0].title,
    message: rows[0].title,
    payload: { feed_id: rows[0].id },
    priority: rows[0].priority === "urgent" ? "high" : "normal",
    channels: ["in_app"],
  }).catch(() => {});

  return ok(rows[0]);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["admin", "principal", "hod", "dean", "sysadmin"],
});
