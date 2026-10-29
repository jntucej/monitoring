import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/supervisor/escalations
 *
 * Thin read-only endpoint for the supervisor desk's "Escalation Centre" tab.
 *
 * Returns permission requests that are currently ESCALATED, plus unacknowledged
 * critical/high alerts, and audit-log entries that record an escalation or
 * decision, so the supervisor can see one coherent "what needs senior eyes"
 * view instead of hunting across three tables.
 *
 * Response:
 *   {
 *     success: true,
 *     data: {
 *       escalatedPermissions: [{ ticket_number, workflow_type, status, current_stage,
 *                                 sla_deadline, student_name, created_at }],
 *       activeAlerts: [{ id, severity, title, message, gate_id, gate_name, timestamp }],
 *       recentDecisions: [{ action, user_name, user_role, details, timestamp }],
 *       counts: { escalated, alerts, decisions }
 *     }
 *   }
 *
 * Supervisor-tier roles only. Pure read: no mutations.
 */
interface EscalatedPermissionRow {
  ticket_number: string;
  workflow_type: string;
  status: string;
  current_stage: string;
  sla_deadline: string | null;
  student_name: string | null;
  created_at: string;
}

interface ActiveAlertRow {
  id: string;
  severity: string;
  title: string;
  message: string;
  gate_id: string | null;
  gate_name: string | null;
  timestamp: string;
}

interface DecisionRow {
  action: string;
  user_name: string | null;
  user_role: string | null;
  details: string;
  timestamp: string;
}

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    // Supervisor-tier only.
    const allowed: string[] = ["supervisor", "admin", "sysadmin", "principal"];
    if (!allowed.includes(auth.role)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Escalation centre is only available to supervisor-tier roles." },
        },
        { status: 403 }
      );
    }

    // §2 gate scoping. Supervisors are scoped to their supervised gates;
    // admin / sysadmin / principal are campus-wide and see every gate.
    // Fail-closed: a supervisor with no assigned gates sees an empty view,
    // never all gates.
    const isSupervisor = auth.role === "supervisor";
    const scopedGates = isSupervisor
      ? (auth.supervisedGates ?? [])
      : null; // null = campus-wide

    const [permRes, alertRes, decisionRes] = await Promise.all([
      query<EscalatedPermissionRow>(
        `SELECT pr.ticket_number,
                pr.workflow_type,
                pr.status,
                pr.current_stage,
                pr.sla_deadline,
                u.name AS student_name,
                pr.created_at
           FROM permission_requests pr
           LEFT JOIN users u ON u.id = pr.student_user_id
          WHERE pr.status = 'ESCALATED'
             OR (pr.status = 'PENDING' AND pr.sla_deadline < NOW())
          ORDER BY pr.sla_deadline ASC NULLS LAST
          LIMIT 50`
      ),
      scopedGates && scopedGates.length > 0
        ? query<ActiveAlertRow>(
            `SELECT a.id,
                    a.severity,
                    a.title,
                    a.message,
                    a.gate_id,
                    g.name AS gate_name,
                    a.timestamp
               FROM alerts a
               LEFT JOIN gates g ON g.id = a.gate_id
              WHERE a.resolved = FALSE
                AND a.severity IN ('critical', 'high')
                AND a.gate_id = ANY($1::uuid[])
              ORDER BY a.timestamp DESC
              LIMIT 50`,
            [scopedGates]
          )
        : scopedGates && scopedGates.length === 0
          ? // Fail-closed: unassigned supervisor → no gate-scoped alerts.
            Promise.resolve({ rows: [] } as { rows: ActiveAlertRow[] })
          : query<ActiveAlertRow>(
            `SELECT a.id,
                    a.severity,
                    a.title,
                    a.message,
                    a.gate_id,
                    g.name AS gate_name,
                    a.timestamp
               FROM alerts a
               LEFT JOIN gates g ON g.id = a.gate_id
              WHERE a.resolved = FALSE
                AND a.severity IN ('critical', 'high')
              ORDER BY a.timestamp DESC
              LIMIT 50`
          ),
      query<DecisionRow>(
        `SELECT action,
                user_name,
                user_role,
                COALESCE(details::text, '{}') AS details,
                timestamp
           FROM audit_logs
          WHERE action IN ('PERMISSION_ESCALATED', 'PERMISSION_APPROVED', 'PERMISSION_REJECTED', 'ALERT_RESOLVED', 'LOCKDOWN_RAISED', 'LOCKDOWN_LIFTED')
          ORDER BY timestamp DESC
          LIMIT 30`
      ),
    ]);

    const escalatedPermissions = permRes.rows;
    const activeAlerts = alertRes.rows;
    const recentDecisions = decisionRes.rows;

    return NextResponse.json({
      success: true,
      data: {
        escalatedPermissions,
        activeAlerts,
        recentDecisions,
        // Echo the scoping so the UI can tell campus-wide vs zone-scoped.
        scope: scopedGates === null ? "campus-wide" : "supervised-gates",
        counts: {
          escalated: escalatedPermissions.length,
          alerts: activeAlerts.length,
          decisions: recentDecisions.length,
        },
      },
    });
  } catch (error) {
    console.error("[supervisor/escalations] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to load escalation centre data." },
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, {
    requiredRole: ["supervisor", "admin", "sysadmin", "principal"],
  }),
  { keyPrefix: "supervisor_escalations", maxRequests: 30 }
);

export const dynamic = "force-dynamic";
