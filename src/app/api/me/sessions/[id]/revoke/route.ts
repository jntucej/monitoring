import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const sessionId = parts[parts.length - 2];
  const { rows } = await query<{ id: string }>(
    `UPDATE public.sessions SET revoked_at = NOW()
      WHERE id = $1::uuid AND user_id = $2::uuid AND revoked_at IS NULL
      RETURNING id`,
    [sessionId, auth.userId],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Session not found", 404);
  return ok({ revoked: true, id: rows[0].id });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["student", "staff", "faculty", "hod", "dean", "principal", "admin", "sysadmin"],
});
