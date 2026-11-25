import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok } from "@/server/http/response";

async function handleGet(req: NextRequest) {
  const framework = (req.nextUrl.searchParams.get("framework") ?? "JNTUH").toUpperCase();

  const [students, faculty, movements, circulars, sos, drills] = await Promise.all([
    query<{ cnt: number }>(`SELECT COUNT(*)::int AS cnt FROM public.users WHERE role = 'student' AND deleted_at IS NULL`),
    query<{ cnt: number }>(`SELECT COUNT(*)::int AS cnt FROM public.users WHERE role = 'faculty' AND deleted_at IS NULL`),
    query<{ cnt: number }>(`SELECT COUNT(*)::int AS cnt FROM public.movement_logs WHERE timestamp >= NOW() - INTERVAL '30 days'`),
    query<{ total: number; published: number }>(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'published')::int AS published FROM public.circular_requests`),
    query<{ total: number; resolved: number }>(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved FROM public.sos_requests`),
    query<{ cnt: number }>(`SELECT COUNT(*)::int AS cnt FROM public.lockdown_broadcasts WHERE (data->>'is_drill')::boolean = true`),
  ]);

  return ok({
    framework,
    generated_at: new Date().toISOString(),
    metrics: {
      active_students: students.rows[0]?.cnt ?? 0,
      active_faculty: faculty.rows[0]?.cnt ?? 0,
      gate_movements_30d: movements.rows[0]?.cnt ?? 0,
      circulars_total: circulars.rows[0]?.total ?? 0,
      circulars_published: circulars.rows[0]?.published ?? 0,
      sos_total: sos.rows[0]?.total ?? 0,
      sos_resolved: sos.rows[0]?.resolved ?? 0,
      lockdown_drills_completed: drills.rows[0]?.cnt ?? 0,
    },
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["admin", "sysadmin", "principal", "dean", "oie"],
});
