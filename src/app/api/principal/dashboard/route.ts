import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

function relativeAge(iso: string, now: number): string {
  const ms = now - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function handleGet(_req: NextRequest, _context?: { auth: AuthContext }) {
  const [countsRes, priorityRes, impactRes, delegationsRes, emergencyRes, examsRes, alertsRes] =
    await Promise.all([
      // Counts by state
      query<{
        pending: string;
        escalated: string;
        overdue: string;
        today_decisions: string;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE current_stage = 'principal' AND status = 'PENDING') AS pending,
           COUNT(*) FILTER (WHERE current_stage = 'principal' AND status = 'ESCALATED') AS escalated,
           COUNT(*) FILTER (
             WHERE current_stage = 'principal'
               AND status IN ('PENDING','ESCALATED')
               AND sla_deadline IS NOT NULL
               AND sla_deadline < NOW()
           ) AS overdue,
           COUNT(*) FILTER (
             WHERE current_stage = 'principal'
               AND status IN ('APPROVED','REJECTED')
               AND updated_at::date = CURRENT_DATE
           ) AS today_decisions
         FROM permissions`
      ).catch(() => ({
        rows: [{ pending: "0", escalated: "0", overdue: "0", today_decisions: "0" }],
      })),

      // Priority items
      query<{
        id: string;
        ticket_number: string;
        workflow_type: string;
        reason: string | null;
        sla_deadline: string | null;
        created_at: string;
        student_name: string | null;
        is_emergency: boolean;
      }>(
        `SELECT p.id, p.ticket_number, p.workflow_type, p.reason, p.sla_deadline,
                p.created_at, u.name AS student_name,
                (COALESCE(p.priority, 'normal') = 'urgent' OR p.reason ILIKE '%emergency%') AS is_emergency
           FROM permissions p
           LEFT JOIN users u ON u.id = p.requester_user_id
          WHERE p.current_stage = 'principal'
            AND p.status IN ('PENDING','ESCALATED')
          ORDER BY
            (COALESCE(p.priority, 'normal') = 'urgent') DESC,
            p.sla_deadline ASC NULLS LAST,
            p.created_at ASC
          LIMIT 20`
      ).catch(() => ({ rows: [] as any[] })),

      // Chain impact: how many people are waiting on Principal
      query<{ students: string; faculty: string; total: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE u.role = 'student') AS students,
           COUNT(*) FILTER (WHERE u.role IN ('faculty','hod')) AS faculty,
           COUNT(*) AS total
         FROM permissions p
         JOIN users u ON u.id = p.requester_user_id
         WHERE p.current_stage = 'principal'
           AND p.status IN ('PENDING','ESCALATED')`
      ).catch(() => ({ rows: [{ students: "0", faculty: "0", total: "0" }] })),

      // Delegation health
      query<{
        active: string;
        expiring_soon: string;
        expired_today: string;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE is_active) AS active,
           COUNT(*) FILTER (
             WHERE is_active AND max_duration_hours IS NOT NULL
               AND created_at + (max_duration_hours || ' hours')::INTERVAL < NOW() + INTERVAL '3 days'
           ) AS expiring_soon,
           0 AS expired_today
         FROM delegation_rules
         WHERE workflow_type IN ('hostel','exam','memo','staff_leave')`
      ).catch(() => ({ rows: [{ active: "0", expiring_soon: "0", expired_today: "0" }] })),

      // Emergency items
      query<{
        ticket_number: string;
        subject: string;
        created_at: string;
      }>(
        `SELECT p.ticket_number,
                COALESCE(u.name || ' · ' || COALESCE(p.reason, 'Emergency'),
                         p.ticket_number) AS subject,
                p.created_at
           FROM permissions p
           LEFT JOIN users u ON u.id = p.requester_user_id
          WHERE p.current_stage = 'principal'
            AND p.status IN ('PENDING','ESCALATED')
            AND (COALESCE(p.priority, 'normal') = 'urgent' OR p.reason ILIKE '%emergency%')
          ORDER BY p.created_at DESC
          LIMIT 3`
      ).catch(() => ({ rows: [] as any[] })),

      // Exams overview
      query<{
        pending_clearances: string;
        today_candidates: string;
      }>(
        `SELECT
           COUNT(*) FILTER (WHERE current_stage = 'principal' AND status = 'PENDING') AS pending_clearances,
           (SELECT COUNT(*) FROM movement_logs
            WHERE direction = 'IN'
              AND timestamp::date = CURRENT_DATE
              AND user_id IN (SELECT id FROM users WHERE role = 'student')) AS today_candidates
         FROM permissions
         WHERE workflow_type = 'exam'`
      ).catch(() => ({ rows: [{ pending_clearances: "0", today_candidates: "0" }] })),

      // Legacy fallback support for alerts (PrincipalDashboardPanel, RoleConsole, etc.)
      query<{
        id: string;
        severity: string;
        title: string;
        message: string | null;
        gate_id: string | null;
        gate_name: string | null;
        timestamp: string;
        resolved: boolean;
      }>(
        `SELECT id, severity, title, message, gate_id, gate_name, timestamp, resolved
           FROM alerts
          WHERE resolved = FALSE
          ORDER BY timestamp DESC
          LIMIT 5`
      ).catch(() => ({ rows: [] as any[] })),
    ]);

  const c = countsRes.rows[0];
  const impact = impactRes.rows[0];
  const delegations = delegationsRes.rows[0];
  const exams = examsRes.rows[0];

  const now = Date.now();
  const priorityItems = priorityRes.rows.map((r) => ({
    id: r.id,
    kind: (r.is_emergency ? "emergency" : r.workflow_type === "exam" ? "escalation" : "approval") as
      | "emergency"
      | "escalation"
      | "approval",
    ticket: r.ticket_number,
    subject: r.student_name
      ? `${r.student_name} · ${r.reason ?? r.workflow_type}`
      : `${r.ticket_number} · ${r.workflow_type}`,
    slaDeadline: r.sla_deadline,
    age: relativeAge(r.created_at, now),
    href: `/principal/approvals/pending?ticket=${encodeURIComponent(r.ticket_number)}`,
  }));

  const pendingCount = Number(c.pending);

  return ok({
    // Spec Section 8 PrincipalOverview payload fields:
    counts: {
      pending: pendingCount,
      escalated: Number(c.escalated),
      overdue: Number(c.overdue),
      todayDecisions: Number(c.today_decisions),
    },
    priorityItems,
    chainImpact: {
      students: Number(impact.students),
      faculty: Number(impact.faculty),
      total: Number(impact.total),
    },
    delegations: {
      active: Number(delegations.active),
      expiringSoon: Number(delegations.expiring_soon),
    },
    emergency: emergencyRes.rows.map((r) => ({
      ticket: r.ticket_number,
      subject: r.subject,
      age: relativeAge(r.created_at, now),
    })),
    exams: {
      pendingClearances: Number(exams.pending_clearances),
      todayCandidates: Number(exams.today_candidates),
    },

    // Legacy fields preserved for backward compatibility (PrincipalDashboardPanel, RoleConsole):
    pendingApprovals: pendingCount,
    recentAlerts: alertsRes.rows,
    campusOccupancy: "Data unavailable",
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["principal", "vice_principal", "admin", "sysadmin"],
});
