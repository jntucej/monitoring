import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";

async function handlePost(req: NextRequest) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const requestId = parts[parts.length - 2];
  const { rows } = await query(
    `UPDATE public.class_requests
        SET status_v2 = 'scheduled', updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING id, status_v2`,
    [requestId],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Class request not found", 404);
  return ok(rows[0]);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["faculty", "hod", "admin", "sysadmin"],
});
