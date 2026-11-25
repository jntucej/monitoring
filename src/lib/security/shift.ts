import { query } from "@/lib/postgres";

export async function getActiveShift(operatorId: string) {
  const { rows } = await query<{
    shift_id: string;
    assignment_id: string;
    post_id: string;
    post_code: string;
    post_name: string;
    post_kind: string;
    location_id: string;
    location_name: string;
    gate_id: string | null;
    starts_at: string;
    ends_at: string;
    assignment_status: string;
  }>(
    `SELECT sh.id AS shift_id,
            spa.id AS assignment_id,
            sp.id AS post_id,
            sp.code AS post_code,
            sp.name AS post_name,
            sp.kind AS post_kind,
            cl.id AS location_id,
            cl.name AS location_name,
            cl.gate_id,
            sh.starts_at,
            sh.ends_at,
            spa.status AS assignment_status
       FROM public.security_shifts sh
       JOIN public.shift_post_assignments spa
         ON spa.shift_id = sh.id AND spa.operator_id = $1::uuid
       JOIN public.security_posts sp ON sp.id = spa.post_id
       JOIN public.campus_locations cl ON cl.id = sp.location_id
      WHERE sh.status IN ('published', 'active')
        AND NOW() BETWEEN sh.starts_at AND sh.ends_at
        AND spa.status IN ('assigned', 'checked_in')
      LIMIT 1`,
    [operatorId],
  );
  return rows[0] ?? null;
}

export async function listOnShift(shiftId?: string) {
  const { rows } = await query(
    `SELECT spa.id AS assignment_id,
            spa.shift_id,
            spa.operator_id,
            u.name AS operator_name,
            u.unique_id AS operator_code,
            spa.status AS assignment_status,
            spa.checked_in_at,
            sp.id AS post_id,
            sp.code AS post_code,
            sp.name AS post_name,
            sp.kind AS post_kind,
            cl.name AS location_name,
            cl.gate_id,
            gll.lat,
            gll.lng,
            gll.recorded_at AS last_ping_at
       FROM public.security_shifts sh
       JOIN public.shift_post_assignments spa ON spa.shift_id = sh.id
       JOIN public.users u ON u.id = spa.operator_id
       JOIN public.security_posts sp ON sp.id = spa.post_id
       JOIN public.campus_locations cl ON cl.id = sp.location_id
       LEFT JOIN LATERAL (
         SELECT lat, lng, recorded_at
           FROM public.guard_live_location g
          WHERE g.operator_id = spa.operator_id AND g.shift_id = sh.id
          ORDER BY g.recorded_at DESC
          LIMIT 1
       ) gll ON true
      WHERE ($1::uuid IS NULL AND sh.status IN ('published', 'active') AND NOW() BETWEEN sh.starts_at AND sh.ends_at)
         OR ($1::uuid IS NOT NULL AND sh.id = $1::uuid)
      ORDER BY sp.name ASC, u.name ASC`,
    [shiftId ?? null],
  );
  return rows;
}
