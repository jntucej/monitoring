import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: Request, { auth }: { auth: AuthContext }) {
  if (auth.role === "operator") {
    const { rows: dispatches } = await query(
      `SELECT d.*, s.category, s.priority, s.status AS sos_status, s.description,
              cl.name AS location_name, u.name AS student_name, u.unique_id AS student_roll
         FROM public.sos_dispatch d
         JOIN public.sos_requests s ON s.id = d.sos_id
         LEFT JOIN public.campus_locations cl ON cl.id = COALESCE(s.chosen_loc_id, s.nearest_loc_id)
         LEFT JOIN public.users u ON u.id = s.student_id
        WHERE d.operator_id = $1::uuid
          AND d.status IN ('offered', 'accepted', 'en_route', 'on_scene')
        ORDER BY d.assigned_at DESC`,
      [auth.userId],
    );
    return ok({ dispatches });
  }

  const { rows } = await query(
    `SELECT s.*, cl.name AS location_name
       FROM public.sos_requests s
       LEFT JOIN public.campus_locations cl ON cl.id = COALESCE(s.chosen_loc_id, s.nearest_loc_id)
      WHERE s.student_id = $1::uuid
      ORDER BY s.created_at DESC
      LIMIT 20`,
    [auth.userId],
  );
  return ok({ requests: rows });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "operator", "supervisor", "admin", "sysadmin"],
});
