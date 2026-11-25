import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const parts = new URL(req.url).pathname.split("/");
  const sosId = parts[parts.length - 1];

  const { rows } = await query<{
    id: string;
    student_id: string;
    category: string;
    priority: string;
    status: string;
    description: string | null;
    created_at: string;
    resolved_at: string | null;
    location_name: string | null;
  }>(
    `SELECT s.*, cl.name AS location_name
       FROM public.sos_requests s
       LEFT JOIN public.campus_locations cl ON cl.id = COALESCE(s.chosen_loc_id, s.nearest_loc_id)
      WHERE s.id = $1::uuid LIMIT 1`,
    [sosId],
  );
  const sos = rows[0];
  if (!sos) return fail("NOT_FOUND", "SOS not found", 404);

  if (auth.role === "student" && sos.student_id !== auth.userId) {
    return fail("FORBIDDEN", "Cannot view another student's SOS", 403);
  }

  const { rows: dispatches } = await query(
    `SELECT d.*, u.name AS operator_name
       FROM public.sos_dispatch d
       LEFT JOIN public.users u ON u.id = d.operator_id
      WHERE d.sos_id = $1::uuid
      ORDER BY d.assigned_at DESC`,
    [sosId],
  );

  const { rows: events } = await query(
    `SELECT * FROM public.sos_events WHERE sos_id = $1::uuid ORDER BY occurred_at ASC`,
    [sosId],
  );

  return ok({ sos, dispatches, events });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "operator", "supervisor", "admin", "sysadmin"],
});
