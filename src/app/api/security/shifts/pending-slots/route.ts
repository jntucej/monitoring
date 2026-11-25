import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok } from "@/server/http/response";

async function handleGet() {
  const { rows } = await query(
    `SELECT sp.id AS post_id, sp.code, sp.name, sp.kind, sp.min_guards,
            cl.name AS location_name, cl.lat::float8, cl.lng::float8,
            sh.id AS shift_id, sh.shift_date::text, sh.starts_at, sh.ends_at,
            COUNT(spa.id) FILTER (WHERE spa.status IN ('assigned', 'checked_in'))::int AS assigned_count
       FROM public.security_posts sp
       JOIN public.campus_locations cl ON cl.id = sp.location_id
       CROSS JOIN public.security_shifts sh
       LEFT JOIN public.shift_post_assignments spa
         ON spa.shift_id = sh.id AND spa.post_id = sp.id
      WHERE sp.active = true
        AND sh.status IN ('published', 'active')
        AND sh.ends_at > NOW()
      GROUP BY sp.id, cl.id, sh.id
     HAVING COUNT(spa.id) FILTER (WHERE spa.status IN ('assigned', 'checked_in')) < sp.min_guards
      ORDER BY sh.starts_at ASC, sp.name ASC`,
  );
  return ok({ pending_slots: rows });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["supervisor", "principal", "hod", "dean", "admin", "sysadmin"],
});
