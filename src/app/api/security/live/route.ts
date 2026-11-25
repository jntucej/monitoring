import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok } from "@/server/http/response";
import { listOnShift } from "@/lib/security/shift";

async function handleGet() {
  const guards = await listOnShift();
  // Only show guards who are currently on shift (assigned or checked_in, not checked_out)
  const activeGuards = guards.filter(
    (g: { assignment_status: string }) =>
      g.assignment_status === "checked_in" || g.assignment_status === "assigned",
  );

  const { rows: activeSos } = await query(
    `SELECT s.*, cl.name AS location_name, cl.code AS location_code,
            u.name AS student_name, u.unique_id AS student_roll
       FROM public.sos_requests s
       LEFT JOIN public.campus_locations cl ON cl.id = COALESCE(s.chosen_loc_id, s.nearest_loc_id)
       LEFT JOIN public.users u ON u.id = s.student_id
      WHERE s.status IN ('open', 'dispatched', 'en_route', 'on_scene', 'escalated')
      ORDER BY s.created_at DESC`,
  );

  return ok({
    guards: activeGuards,
    active_sos: activeSos,
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["supervisor", "principal", "hod", "dean", "admin", "sysadmin"],
});
