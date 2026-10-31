import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const [countsRes, priorityRes, gatesRes, incidentsRes, shiftRes] = await Promise.all([
    // Current shift counts
    query<{
      escalations_open: string;
      incidents_open: string;
      exceptions_today: string;
      resolved_today: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'ESCALATED' AND current_stage IN ('supervisor','principal')) AS escalations_open,
         (SELECT COUNT(*) FROM alerts WHERE resolved = FALSE AND severity IN ('critical','high')) AS incidents_open,
         (SELECT COUNT(*) FROM movement_logs
          WHERE is_correction = TRUE AND timestamp::date = CURRENT_DATE) AS exceptions_today,
         (SELECT COUNT(*) FROM audit_logs
          WHERE user_id = $1
            AND action IN ('PERMISSION_ESCALATED','PERMISSION_APPROVED','SCAN_CORRECTED')
            AND timestamp::date = CURRENT_DATE) AS resolved_today
       FROM permissions`,
      [auth.userId]
    ).catch(() => ({ rows: [{ escalations_open: "0", incidents_open: "0", exceptions_today: "0", resolved_today: "0" }] })),

    // Top-priority items
    query<{
      id: string;
      kind: string;
      ticket: string;
      subject: string;
      sla_deadline: string | null;
      created_at: string;
    }>(
      `(SELECT id, 'escalation' AS kind, ticket_number AS ticket,
               COALESCE(u.name || ' · ' || COALESCE(p.reason, p.workflow_type), p.ticket_number) AS subject,
               p.sla_deadline, p.created_at
          FROM permissions p
          LEFT JOIN users u ON u.id = p.requester_user_id
         WHERE p.status = 'ESCALATED'
           AND p.current_stage IN ('supervisor','principal')
         ORDER BY p.sla_deadline ASC NULLS LAST, p.created_at ASC
         LIMIT 5)
       UNION ALL
       (SELECT id::text, 'incident' AS kind, COALESCE(user_unique_id, id::text) AS ticket,
               title || ' · ' || COALESCE(message, '') AS subject,
               NULL::timestamptz, timestamp AS created_at
          FROM alerts
         WHERE resolved = FALSE AND severity IN ('critical','high')
         ORDER BY timestamp DESC
         LIMIT 5)
       ORDER BY created_at DESC
       LIMIT 10`
    ).catch(() => ({ rows: [] as any[] })),

    // Gates under this supervisor
    query<{
      id: string;
      name: string;
      is_active: boolean;
      on_post_count: string;
      last_activity: string | null;
    }>(
      `SELECT g.id, g.name, g.is_active,
              (SELECT COUNT(*) FROM users u
               WHERE u.gate_id = g.id AND u.status = 'ACTIVE'
                 AND u.role IN ('operator','supervisor','worker','staff')) AS on_post_count,
              (SELECT MAX(timestamp) FROM movement_logs WHERE gate_id = g.id) AS last_activity
         FROM gates g
         WHERE g.id = ANY($1)
         ORDER BY g.name`,
      [auth.supervisedGates ?? []]
    ).catch(() => ({ rows: [] as any[] })),

    // Recent incidents
    query<{
      id: string;
      severity: string;
      title: string;
      timestamp: string;
      resolved: boolean;
    }>(
      `SELECT id::text, severity, title, timestamp, resolved
         FROM alerts
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        ORDER BY timestamp DESC
        LIMIT 10`
    ).catch(() => ({ rows: [] as any[] })),

    // Current shift (from a shift_assignments table if present, else placeholder)
    query<{
      shift_id: string | null;
      started_at: string | null;
      ends_at: string | null;
    }>(
      `SELECT
         '${new Date().toISOString().slice(0, 13)}' AS shift_id,
         date_trunc('hour', NOW())::text AS started_at,
         (date_trunc('hour', NOW()) + INTERVAL '8 hours')::text AS ends_at`
    ).catch(() => ({ rows: [{ shift_id: null, started_at: null, ends_at: null }] })),
  ]);

  const c = countsRes.rows[0];
  const shift = shiftRes.rows[0];
  const now = Date.now();

  return ok({
    counts: {
      escalationsOpen: Number(c.escalations_open),
      incidentsOpen: Number(c.incidents_open),
      exceptionsToday: Number(c.exceptions_today),
      resolvedToday: Number(c.resolved_today),
    },
    priorityItems: priorityRes.rows.map((r) => ({
      id: r.id,
      kind: r.kind as "escalation" | "incident",
      ticket: r.ticket,
      subject: r.subject,
      slaDeadline: r.sla_deadline,
      age: relativeAge(r.created_at, now),
      href:
        r.kind === "escalation"
          ? `/supervisor/response/escalations?ticket=${encodeURIComponent(r.ticket)}`
          : `/supervisor/response/incidents?id=${r.id}`,
    })),
    gates: gatesRes.rows.map((g) => ({
      id: g.id,
      name: g.name,
      isActive: g.is_active,
      onPost: Number(g.on_post_count),
      lastActivity: g.last_activity,
    })),
    incidents: incidentsRes.rows.map((r) => ({
      id: r.id,
      severity: r.severity,
      title: r.title,
      timestamp: r.timestamp,
      resolved: r.resolved,
    })),
    shift: {
      shiftId: shift.shift_id,
      startedAt: shift.started_at,
      endsAt: shift.ends_at,
    },
  });
}

function relativeAge(iso: string, now: number): string {
  const ms = now - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["supervisor", "principal", "admin", "sysadmin"],
});
