import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok } from "@/server/http/response";

async function handleGet() {
  const { rows } = await query(
    `SELECT d.id, d.serial, d.kind, d.station_type, d.status, d.last_heartbeat_at,
            g.name AS gate_name,
            CASE
              WHEN d.last_heartbeat_at IS NULL THEN 'offline'
              WHEN d.last_heartbeat_at > NOW() - INTERVAL '2 minutes' THEN 'online'
              WHEN d.last_heartbeat_at > NOW() - INTERVAL '10 minutes' THEN 'degraded'
              ELSE 'offline'
            END AS health_state
       FROM public.gate_devices d
       LEFT JOIN public.gates g ON g.id = d.gate_id
      ORDER BY d.station_type ASC, g.name NULLS LAST, d.serial ASC`,
  );
  return ok({ devices: rows });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});
