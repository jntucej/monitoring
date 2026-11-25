import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { logSosEvent } from "@/lib/security/dispatch";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const sosId = parts[parts.length - 2];

  const { rows } = await query<{ id: string; status: string }>(
    `UPDATE public.sos_requests
        SET status = 'cancelled', resolved_at = NOW()
      WHERE id = $1::uuid
        AND student_id = $2::uuid
        AND status IN ('open', 'dispatched', 'en_route')
      RETURNING id, status`,
    [sosId, auth.userId],
  );
  if (!rows[0]) {
    return fail("CANNOT_CANCEL", "SOS not found or already on scene / resolved", 409);
  }

  await query(
    `UPDATE public.sos_dispatch SET status = 'expired'
      WHERE sos_id = $1::uuid AND status IN ('offered', 'accepted', 'en_route')`,
    [sosId],
  );
  await logSosEvent(sosId, auth.userId, auth.role, "cancelled", {});

  return ok(rows[0]);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["student"],
});
