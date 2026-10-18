import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(
  req: NextRequest,
  { auth }: { auth: AuthContext },
): Promise<Response> {
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "50"), 200);

  try {
    const { rows } = await query<{
      id: string;
      accessed_by_name: string | null;
      accessed_by_role: string | null;
      resource: string | null;
      reason: string | null;
      timestamp: string;
    }>(
      `SELECT
         a.id,
         COALESCE(u.name, a.user_name, 'Unknown') AS accessed_by_name,
         COALESCE(u.role, a.user_role, 'unknown') AS accessed_by_role,
         (a.details->>'resource')::text          AS resource,
         (a.details->>'reason')::text            AS reason,
         a.timestamp
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE (a.details->>'subject_user_id')::uuid = $1
         AND a.user_id <> $1
         AND a.action IN (
           'MOVEMENT_HISTORY_VIEWED',
           'MEDICAL_DOC_VIEWED',
           'CONTACT_INFO_VIEWED',
           'STUDENT_PROFILE_VIEWED',
           'PERMISSION_TICKET_VIEWED'
         )
       ORDER BY a.timestamp DESC
       LIMIT $2`,
      [auth.userId, limit],
    );

    return ok({
      entries: rows.map((r) => ({
        id: r.id,
        accessedBy: r.accessed_by_name ?? "Unknown",
        accessedByRole: r.accessed_by_role ?? "unknown",
        resource: r.resource ?? "student data",
        reason: r.reason,
        timestamp: r.timestamp,
      })),
    });
  } catch {
    return ok({ entries: [] });
  }
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  windowMs: 60_000,
  maxRequests: 60,
});
