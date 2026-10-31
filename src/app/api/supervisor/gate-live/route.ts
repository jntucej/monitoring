import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/supervisor/gate-live
 * Returns real-time gate occupancy, guards on post, and activity.
 */
async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const { rows } = await query<{
    id: string;
    gate_code: string;
    name: string;
    location: string | null;
    is_active: boolean;
    on_post_count: string;
    last_activity: string | null;
    recent_entries: string;
    recent_exits: string;
  }>(
    `SELECT
       g.id, g.gate_code, g.name, g.location, g.is_active,
       (SELECT COUNT(*) FROM users u
        WHERE u.gate_id = g.id AND u.status = 'ACTIVE'
          AND u.role IN ('operator','supervisor','worker','staff')) AS on_post_count,
       (SELECT MAX(timestamp) FROM movement_logs WHERE gate_id = g.id) AS last_activity,
       (SELECT COUNT(*) FROM movement_logs
        WHERE gate_id = g.id AND direction = 'IN'
          AND timestamp >= NOW() - INTERVAL '1 hour') AS recent_entries,
       (SELECT COUNT(*) FROM movement_logs
        WHERE gate_id = g.id AND direction = 'OUT'
          AND timestamp >= NOW() - INTERVAL '1 hour') AS recent_exits
     FROM gates g
     WHERE ($1::uuid[] IS NULL OR cardinality($1::uuid[]) = 0 OR g.id = ANY($1))
     ORDER BY g.name`,
    [auth.supervisedGates && auth.supervisedGates.length > 0 ? auth.supervisedGates : null]
  ).catch(() => ({ rows: [] as any[] }));

  return ok({
    gates: rows.map((g) => ({
      id: g.id,
      gateCode: g.gate_code,
      name: g.name,
      location: g.location,
      isActive: g.is_active,
      onPost: Number(g.on_post_count || 0),
      lastActivity: g.last_activity,
      recentEntries: Number(g.recent_entries || 0),
      recentExits: Number(g.recent_exits || 0),
    })),
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["supervisor", "principal", "admin", "sysadmin"],
});
