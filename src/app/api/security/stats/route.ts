import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok } from "@/server/http/response";

async function handleGet(req: NextRequest) {
  const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? 30)));

  const { rows } = await query(
    `SELECT u.id AS operator_id,
            u.unique_id AS operator_code,
            u.name AS operator_name,
            COUNT(spa.id)::int AS total_shifts,
            COUNT(spa.id) FILTER (WHERE sh.is_extra = true)::int AS extra_shifts,
            COUNT(spa.id) FILTER (WHERE spa.status = 'no_show')::int AS no_shows,
            COALESCE(
              ROUND(SUM(
                CASE
                  WHEN spa.checked_in_at IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (COALESCE(spa.checked_out_at, LEAST(NOW(), sh.ends_at)) - spa.checked_in_at)) / 3600.0
                  ELSE 0
                END
              )::numeric, 1),
              0
            )::float8 AS hours_worked,
            (SELECT COUNT(*)::int FROM public.sos_dispatch d
              WHERE d.operator_id = u.id AND d.status IN ('accepted','en_route','on_scene','cleared')
                AND d.assigned_at >= NOW() - ($1::int * INTERVAL '1 day')) AS sos_accepted,
            (SELECT COUNT(*)::int FROM public.sos_dispatch d
              WHERE d.operator_id = u.id AND d.status = 'cleared'
                AND d.assigned_at >= NOW() - ($1::int * INTERVAL '1 day')) AS sos_cleared,
            (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (d.ack_at - d.assigned_at)))::numeric, 1)::float8
               FROM public.sos_dispatch d
              WHERE d.operator_id = u.id AND d.ack_at IS NOT NULL
                AND d.assigned_at >= NOW() - ($1::int * INTERVAL '1 day')) AS avg_ack_seconds
       FROM public.users u
       LEFT JOIN public.shift_post_assignments spa ON spa.operator_id = u.id
       LEFT JOIN public.security_shifts sh
         ON sh.id = spa.shift_id AND sh.shift_date >= (CURRENT_DATE - $1::int)
      WHERE u.role = 'operator' AND u.deleted_at IS NULL
      GROUP BY u.id
      ORDER BY hours_worked DESC, total_shifts DESC, u.name ASC`,
    [days],
  );

  return ok({ days, guards: rows });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["supervisor", "principal", "hod", "dean", "admin", "sysadmin"],
});
