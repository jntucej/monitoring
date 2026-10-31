import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

function formatAge(createdAt: string | Date): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function handleGet(_req: NextRequest, _context: { auth: AuthContext }) {
  const [
    countsRes,
    priorityRes,
    examDayRes,
    insightsRes,
    hotRes,
    upcomingRes,
    principalRes,
  ] = await Promise.all([
    // Counts: pending, escalated, today's decisions at VP stage
    query<{
      pending_approvals: string;
      escalated: string;
      today_decisions: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE current_stage = 'vice_principal' AND status = 'PENDING') AS pending_approvals,
         COUNT(*) FILTER (WHERE current_stage = 'vice_principal' AND status = 'ESCALATED') AS escalated,
         COUNT(*) FILTER (WHERE current_stage = 'vice_principal' AND status IN ('APPROVED','REJECTED') AND updated_at::date = CURRENT_DATE) AS today_decisions
       FROM permissions`
    ).catch(() => ({
      rows: [{ pending_approvals: "0", escalated: "0", today_decisions: "0" }],
    })),

    // Priority items: top 5 VP-stage tickets
    query<{
      id: string;
      status: string;
      ticket_number: string;
      workflow_type: string;
      reason: string | null;
      student_name: string | null;
      sla_deadline: string | null;
      created_at: string;
    }>(
      `SELECT p.id, p.status, p.ticket_number, p.workflow_type, p.reason,
              p.sla_deadline, p.created_at,
              u.name AS student_name
         FROM permissions p
         LEFT JOIN users u ON u.id = p.requester_user_id
        WHERE p.current_stage = 'vice_principal'
          AND p.status IN ('PENDING', 'ESCALATED')
        ORDER BY
          CASE WHEN p.status = 'ESCALATED' THEN 0 ELSE 1 END,
          p.sla_deadline ASC NULLS LAST,
          p.created_at ASC
        LIMIT 5`
    ).catch(() => ({ rows: [] as any[] })),

    // Exam day state
    query<{ access_state: string }>(
      `SELECT access_state FROM exam_day_state WHERE day = CURRENT_DATE LIMIT 1`
    ).catch(() => ({ rows: [] as any[] })),

    // Personal pace vs. previous 30d (insights)
    query<{ this_week: string; last_week: string; avg_response_sec: string }>(
      `WITH buckets AS (
         SELECT
           COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '7 days') AS this_week,
           COUNT(*) FILTER (
             WHERE updated_at >= NOW() - INTERVAL '14 days'
               AND updated_at <  NOW() - INTERVAL '7 days'
           ) AS last_week
         FROM permissions
         WHERE current_stage IN ('vice_principal')
           AND status IN ('APPROVED','REJECTED')
       )
       SELECT this_week, last_week,
         COALESCE((SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))
                   FROM permissions
                   WHERE current_stage = 'vice_principal'
                     AND status IN ('APPROVED','REJECTED')
                     AND updated_at >= NOW() - INTERVAL '7 days'), 0) AS avg_response_sec
       FROM buckets`
    ).catch(() => ({
      rows: [{ this_week: "0", last_week: "0", avg_response_sec: "0" }],
    })),

    // Departments with elevated absence today
    query<{ department: string; absent: string; total: string; rate: string }>(
      `SELECT u.department_id AS department,
              COUNT(*) FILTER (WHERE NOT EXISTS (
                SELECT 1 FROM movement_logs ml
                WHERE ml.user_id = u.id
                  AND ml.direction = 'IN'
                  AND ml.timestamp::date = CURRENT_DATE
              )) AS absent,
              COUNT(*) AS total,
              ROUND(
                100.0 * COUNT(*) FILTER (WHERE NOT EXISTS (
                  SELECT 1 FROM movement_logs ml
                  WHERE ml.user_id = u.id
                    AND ml.direction = 'IN'
                    AND ml.timestamp::date = CURRENT_DATE
                )) / NULLIF(COUNT(*), 0), 1
              ) AS rate
         FROM users u
        WHERE u.role IN ('student','faculty','hod','staff')
          AND u.status = 'ACTIVE'
          AND u.department_id IS NOT NULL
        GROUP BY u.department_id
        HAVING COUNT(*) > 0
        ORDER BY rate DESC
        LIMIT 3`
    ).catch(() => ({ rows: [] as any[] })),

    // SLA deadlines within the next 24h
    query<{
      ticket_number: string;
      subject: string;
      sla_deadline: string;
      workflow_type: string;
    }>(
      `SELECT p.ticket_number,
              COALESCE(u.name || ' · ' || COALESCE(p.reason, p.workflow_type),
                       p.ticket_number || ' · ' || p.workflow_type) AS subject,
              p.sla_deadline, p.workflow_type
         FROM permissions p
         LEFT JOIN users u ON u.id = p.requester_user_id
        WHERE p.current_stage IN ('vice_principal','principal')
          AND p.status IN ('PENDING','ESCALATED')
          AND p.sla_deadline IS NOT NULL
          AND p.sla_deadline BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
        ORDER BY p.sla_deadline ASC
        LIMIT 5`
    ).catch(() => ({ rows: [] as any[] })),

    // Principal's pending count (social proof — VP feeds the chain)
    query<{ principal_pending: string; my_pending: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE current_stage = 'principal'
                          AND status IN ('PENDING','ESCALATED')) AS principal_pending,
         COUNT(*) FILTER (WHERE current_stage = 'vice_principal'
                          AND status IN ('PENDING','ESCALATED')) AS my_pending
         FROM permissions`
    ).catch(() => ({
      rows: [{ principal_pending: "0", my_pending: "0" }],
    })),
  ]);

  const counts = countsRes.rows[0] ?? {
    pending_approvals: "0",
    escalated: "0",
    today_decisions: "0",
  };
  const ins = insightsRes.rows[0] ?? {
    this_week: "0",
    last_week: "0",
    avg_response_sec: "0",
  };
  const principal = principalRes.rows[0] ?? {
    principal_pending: "0",
    my_pending: "0",
  };

  const examDayStateRaw = examDayRes.rows[0]?.access_state?.toLowerCase();
  const examDayState: "open" | "closed" =
    examDayStateRaw === "open" ? "open" : "closed";

  const priorityItems = priorityRes.rows.map((r) => {
    const kind: "approval" | "escalation" | "exception" =
      r.status === "ESCALATED"
        ? "escalation"
        : r.workflow_type === "exception"
        ? "exception"
        : "approval";

    const subject = r.student_name
      ? `${r.student_name} · ${r.reason ?? r.workflow_type}`
      : `${r.ticket_number} · ${r.workflow_type}`;

    return {
      id: r.id,
      kind,
      ticket: r.ticket_number,
      subject,
      slaDeadline: r.sla_deadline,
      age: formatAge(r.created_at),
      href: "/vice-principal/approvals/pending",
    };
  });

  return ok({
    counts: {
      pendingApprovals: Number(counts.pending_approvals),
      escalated: Number(counts.escalated),
      todayDecisions: Number(counts.today_decisions),
      examDayState,
    },
    priorityItems,
    insights: {
      thisWeek: Number(ins.this_week),
      lastWeek: Number(ins.last_week),
      avgResponseSec: Number(ins.avg_response_sec),
    },
    hotSpots: hotRes.rows.map((r) => ({
      department: r.department,
      absent: Number(r.absent),
      total: Number(r.total),
      rate: Number(r.rate),
    })),
    upcoming: upcomingRes.rows.map((r) => ({
      ticket: r.ticket_number,
      subject: r.subject,
      slaDeadline: r.sla_deadline,
      workflowType: r.workflow_type,
    })),
    principalBridge: {
      myPending: Number(principal.my_pending),
      principalPending: Number(principal.principal_pending),
    },
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["vice_principal", "principal", "admin", "sysadmin"],
});
