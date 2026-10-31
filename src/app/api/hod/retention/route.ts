import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  const [winsRes, insightsRes] = await Promise.all([
    query<{
      ticket_number: string;
      status: string;
      updated_at: string;
      created_at: string;
      student_name: string | null;
      reason: string | null;
      workflow_type: string;
      impacted: string;
    }>(
      `SELECT p.ticket_number, p.status, p.updated_at, p.created_at,
              u.name AS student_name, p.reason, p.workflow_type,
              (SELECT COUNT(*) FROM users
               WHERE department_id = u.department_id
                 AND role = 'student'
                 AND status = 'ACTIVE') AS impacted
         FROM permissions p
         LEFT JOIN users u ON u.id = p.requester_user_id
        WHERE p.updated_at::date = CURRENT_DATE
          AND p.status IN ('APPROVED','REJECTED','ESCALATED')
          AND p.current_stage IN ('hod','completed')
        ORDER BY p.updated_at DESC
        LIMIT 20`
    ).catch(() => ({ rows: [] as any[] })),

    query<{
      this_week: string;
      last_week: string;
      avg_response_sec: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '7 days') AS this_week,
         COUNT(*) FILTER (
           WHERE updated_at >= NOW() - INTERVAL '14 days'
             AND updated_at <  NOW() - INTERVAL '7 days'
         ) AS last_week,
         COALESCE((SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))
                   FROM permissions
                   WHERE current_stage = 'hod'
                     AND status IN ('APPROVED','REJECTED')
                     AND updated_at >= NOW() - INTERVAL '7 days'), 0) AS avg_response_sec
       FROM permissions
       WHERE current_stage = 'hod'
         AND status IN ('APPROVED','REJECTED')`
    ).catch(() => ({
      rows: [{ this_week: "0", last_week: "0", avg_response_sec: "0" }],
    })),
  ]);

  const ins = insightsRes.rows[0] ?? {
    this_week: "0",
    last_week: "0",
    avg_response_sec: "0",
  };

  return ok({
    todayWins: winsRes.rows.map((r) => ({
      ticket: r.ticket_number,
      outcome: r.status,
      subject: r.student_name
        ? `${r.student_name} · ${r.reason ?? r.workflow_type}`
        : `${r.ticket_number} · ${r.workflow_type}`,
      at: r.updated_at,
      responseMs:
        new Date(r.updated_at).getTime() - new Date(r.created_at).getTime(),
      impactedStudents: Number(r.impacted || 0),
    })),
    insights: {
      thisWeek: Number(ins.this_week),
      lastWeek: Number(ins.last_week),
      avgResponseSec: Number(ins.avg_response_sec),
    },
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["hod", "principal", "admin", "sysadmin"],
});
