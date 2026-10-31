import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/supervisor/retention
 * Supervisor shift performance stats, wins, and response time metrics.
 */
async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const [winsRes, statsRes] = await Promise.all([
    query<{
      id: string;
      ticket_number: string;
      kind: string;
      subject: string;
      timestamp: string;
      created_at: string;
    }>(
      `SELECT
         al.id::text,
         COALESCE(p.ticket_number, al.id::text) AS ticket_number,
         CASE
           WHEN al.action = 'PERMISSION_ESCALATED' THEN 'escalation_cleared'
           WHEN al.action = 'PERMISSION_APPROVED' THEN 'escalation_cleared'
           WHEN al.action = 'SCAN_CORRECTED' THEN 'exception_reviewed'
           ELSE 'escalation_cleared'
         END AS kind,
         COALESCE(u.name || ' · ' || al.action, al.action) AS subject,
         al.timestamp::text,
         COALESCE(p.created_at::text, al.timestamp::text) AS created_at
       FROM audit_logs al
       LEFT JOIN permissions p ON p.id::text = (al.details->>'permissionId')
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.user_id = $1
         AND al.timestamp >= NOW() - INTERVAL '24 hours'
         AND al.action IN ('PERMISSION_ESCALATED', 'PERMISSION_APPROVED', 'SCAN_CORRECTED')
       ORDER BY al.timestamp DESC
       LIMIT 20`,
      [auth.userId]
    ).catch(() => ({ rows: [] as any[] })),

    query<{
      this_week: string;
      last_week: string;
      avg_response_sec: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '7 days') AS this_week,
         COUNT(*) FILTER (
           WHERE timestamp >= NOW() - INTERVAL '14 days'
             AND timestamp < NOW() - INTERVAL '7 days'
         ) AS last_week,
         COALESCE((
           SELECT AVG(EXTRACT(EPOCH FROM (al.timestamp - p.created_at)))
           FROM audit_logs al
           JOIN permissions p ON p.id::text = (al.details->>'permissionId')
           WHERE al.user_id = $1
             AND al.timestamp >= NOW() - INTERVAL '7 days'
         ), 0) AS avg_response_sec
       FROM audit_logs
       WHERE user_id = $1
         AND action IN ('PERMISSION_ESCALATED', 'PERMISSION_APPROVED', 'SCAN_CORRECTED')`,
      [auth.userId]
    ).catch(() => ({
      rows: [{ this_week: "0", last_week: "0", avg_response_sec: "0" }],
    })),
  ]);

  const s = statsRes.rows[0] ?? { this_week: "0", last_week: "0", avg_response_sec: "0" };

  return ok({
    shiftWins: winsRes.rows.map((r) => ({
      ticket: r.ticket_number,
      kind: r.kind,
      subject: r.subject,
      at: r.timestamp,
      responseMs: Math.max(
        0,
        new Date(r.timestamp).getTime() - new Date(r.created_at).getTime()
      ),
    })),
    stats: {
      thisWeek: Number(s.this_week),
      lastWeek: Number(s.last_week),
      avgResponseSec: Number(s.avg_response_sec),
    },
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["supervisor", "principal", "admin", "sysadmin"],
});
