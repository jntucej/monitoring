import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/supervisor/shift
 * Returns current shift status, guard coverage, and unresolved incidents.
 *
 * POST /api/supervisor/shift
 * Completes a handover / shift report.
 */
async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const [incidentsRes, gatesRes, shiftRes] = await Promise.all([
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM alerts
       WHERE resolved = FALSE AND severity IN ('critical', 'high')`
    ).catch(() => ({ rows: [{ count: "0" }] })),

    query<{ total: string; staffed: string }>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE (SELECT COUNT(*) FROM users u WHERE u.gate_id = g.id AND u.status = 'ACTIVE') > 0) AS staffed
       FROM gates g
       WHERE ($1::uuid[] IS NULL OR cardinality($1::uuid[]) = 0 OR g.id = ANY($1))`,
      [auth.supervisedGates && auth.supervisedGates.length > 0 ? auth.supervisedGates : null]
    ).catch(() => ({ rows: [{ total: "0", staffed: "0" }] })),

    query<{
      shift_id: string;
      started_at: string;
      ends_at: string;
    }>(
      `SELECT
         '${new Date().toISOString().slice(0, 13)}' AS shift_id,
         date_trunc('hour', NOW())::text AS started_at,
         (date_trunc('hour', NOW()) + INTERVAL '8 hours')::text AS ends_at`
    ).catch(() => ({
      rows: [
        {
          shift_id: new Date().toISOString().slice(0, 13),
          started_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 8 * 3600_000).toISOString(),
        },
      ],
    })),
  ]);

  const incidentsCount = Number(incidentsRes.rows[0]?.count || 0);
  const totalGates = Number(gatesRes.rows[0]?.total || 0);
  const staffedGates = Number(gatesRes.rows[0]?.staffed || 0);
  const isClean = incidentsCount === 0 && (totalGates === 0 || staffedGates === totalGates);

  const shift = shiftRes.rows[0];

  return ok({
    shift: {
      shiftId: shift.shift_id,
      startedAt: shift.started_at,
      endsAt: shift.ends_at,
    },
    isClean,
    unresolvedIncidents: incidentsCount,
    gateCoverage: {
      total: totalGates,
      staffed: staffedGates,
    },
  });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const body = await req.json().catch(() => ({}));
  const { notes, nextSupervisorId } = body;

  await query(
    `INSERT INTO audit_logs (action, user_id, user_name, user_role, details, timestamp)
     VALUES ('SUPERVISOR_HANDOVER', $1, $2, $3, $4, NOW())`,
    [
      auth.userId,
      auth.email || "supervisor",
      auth.role,
      JSON.stringify({ notes: notes || "", nextSupervisorId: nextSupervisorId || null }),
    ]
  ).catch(() => null);

  return ok({
    success: true,
    timestamp: new Date().toISOString(),
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["supervisor", "principal", "admin", "sysadmin"],
});

export const POST = withAuthorization(handlePost, {
  requiredRole: ["supervisor", "principal", "admin", "sysadmin"],
});
