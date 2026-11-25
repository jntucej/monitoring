import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => ({}));
  const currentSessionId = b?.current_session_id ? String(b.current_session_id) : null;

  const res = await query(
    currentSessionId
      ? `UPDATE public.sessions SET revoked_at = NOW()
          WHERE user_id = $1::uuid AND id <> $2::uuid AND revoked_at IS NULL`
      : `UPDATE public.sessions SET revoked_at = NOW()
          WHERE user_id = $1::uuid AND revoked_at IS NULL`,
    currentSessionId ? [auth.userId, currentSessionId] : [auth.userId],
  );
  return ok({ revoked_count: res.rowCount ?? 0 });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["student", "staff", "faculty", "hod", "dean", "principal", "admin", "sysadmin"],
});
