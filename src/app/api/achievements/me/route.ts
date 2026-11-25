import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: Request, { auth }: { auth: AuthContext }) {
  const { rows } = await query(
    `SELECT ua.id, ua.achievement_code, ua.scope, ua.note, ua.awarded_by_role, ua.created_at,
            at.title, at.category, at.description
       FROM public.user_achievements ua
       LEFT JOIN public.achievement_templates at ON at.id = ua.template_id
      WHERE ua.user_id = $1::uuid AND ua.revoked_at IS NULL
      ORDER BY ua.created_at DESC`,
    [auth.userId],
  );
  return ok({ achievements: rows });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "admin", "sysadmin"],
});
