import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { buildShareToken } from "@/lib/student/achievements";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const id = parts[parts.length - 2];
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM public.user_achievements WHERE id = $1::uuid AND user_id = $2::uuid AND revoked_at IS NULL LIMIT 1`,
    [id, auth.userId],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Achievement not found", 404);

  const token = buildShareToken(id);
  return ok({ token, url: `/a/${token}` });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["student", "admin", "sysadmin"],
});
