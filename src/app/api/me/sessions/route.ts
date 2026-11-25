import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: Request, { auth }: { auth: AuthContext }) {
  const { rows } = await query(
    `SELECT id, created_at, last_seen_at, expires_at, ip_address, user_agent, device_hash
       FROM public.sessions
      WHERE user_id = $1::uuid
        AND revoked_at IS NULL
        AND expires_at > NOW()
      ORDER BY last_seen_at DESC NULLS LAST, created_at DESC`,
    [auth.userId],
  );
  return ok({ sessions: rows });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "staff", "faculty", "hod", "dean", "principal", "admin", "sysadmin"],
});
