import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const circularId = parts[parts.length - 2];

  const { rows: cRows } = await query<{ feed_item_id: string | null }>(
    `SELECT feed_item_id FROM public.circular_requests WHERE id = $1::uuid LIMIT 1`,
    [circularId],
  );
  const feedId = cRows[0]?.feed_item_id;
  if (!feedId) return fail("NOT_FOUND", "Published circular not found", 404);

  await query(
    `INSERT INTO public.campus_feed_receipts (feed_id, user_id, seen_at, noted_at)
     VALUES ($1::uuid, $2::uuid, NOW(), NOW())
     ON CONFLICT (feed_id, user_id) DO UPDATE
       SET seen_at = COALESCE(public.campus_feed_receipts.seen_at, NOW()),
           noted_at = COALESCE(public.campus_feed_receipts.noted_at, NOW())`,
    [feedId, auth.userId],
  );

  await addAudit({
    action: "CIRCULAR_NOTED",
    userId: auth.userId,
    role: auth.role,
    details: { circularId, feedId },
  }).catch(() => {});

  return ok({ noted: true, circular_id: circularId });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["student", "faculty", "hod", "guardian", "staff", "operator", "worker", "admin", "sysadmin"],
});
