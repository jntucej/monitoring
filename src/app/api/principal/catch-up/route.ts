import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/principal/catch-up — what has happened since your last visit.
 *
 * Returns:
 * - approvalsCleared: count of PENDING → APPROVED/REJECTED in the last 7 days
 * - newEscalations: count of tickets escalated to warden_or_principal/principal
 * - openAlerts: recent unresolved alerts (title, severity, timestamp)
 * - activeDelegations: delegation_rules currently in force for this principal
 * - quickWins: up to 3 tickets that are simple quick wins (single-stage, <24h SLA)
 */
async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    // Pending approvals since last 7 days
    const { rows: pendingSince } = await query(
      `SELECT COUNT(*)::int AS count
       FROM permissions
       WHERE status = 'PENDING'
         AND current_stage IN ('principal', 'warden_or_principal')
         AND created_at > now() - INTERVAL '7 days'`
    );

    // Approvals cleared (APPROVED/REJECTED) in the last 24 hours
    const { rows: clearedRows } = await query(
      `SELECT COUNT(*)::int AS count
       FROM permissions
       WHERE status IN ('APPROVED', 'REJECTED')
         AND updated_at > now() - INTERVAL '1 day'`
    );

    // Escalated tickets pending at principal/warden stage
    const { rows: escRows } = await query(
      `SELECT COUNT(*)::int AS count
       FROM permissions
       WHERE status = 'PENDING'
         AND current_stage IN ('principal', 'warden_or_principal')
         AND forwarded_from_role IS NOT NULL`
    );

    // Unresolved alerts (use alerts table if it exists, otherwise empty)
    let alerts: unknown[] = [];
    try {
      const { rows: alertRows } = await query(
        `SELECT id, title, severity, gate_name, timestamp
           FROM alerts
          WHERE resolved = FALSE
          ORDER BY timestamp DESC
          LIMIT 5`
      );
      alerts = alertRows;
    } catch {
      // alerts table may not have title/gate_name columns — degrade gracefully
      alerts = [];
    }

    // Active delegations
    const { rows: delRows } = await query(
      `SELECT name, delegate_role, scope, expires_at
         FROM delegation_rules
        WHERE is_active = TRUE
          AND (expires_at IS NULL OR expires_at > now())
        ORDER BY priority ASC
        LIMIT 10`
    );

    // Quick wins: hostel out-passes pending at principal stage with short SLA
    const { rows: qwRows } = await query(
      `SELECT p.id, p.ticket_number, p.workflow_type, p.current_stage,
              p.sla_deadline, p.status
         FROM permissions p
        WHERE p.status = 'PENDING'
          AND p.current_stage = 'principal'
          AND p.workflow_type = 'hostel'
          AND p.sla_deadline > now() AND p.sla_deadline < now() + INTERVAL '6 hours'
        ORDER BY p.sla_deadline ASC
        LIMIT 3`
    );

    return NextResponse.json({
      success: true,
      data: {
        approvalsCleared: clearedRows[0]?.count ?? 0,
        pendingSince: pendingSince[0]?.count ?? 0,
        newEscalations: escRows[0]?.count ?? 0,
        openAlerts: alerts,
        activeDelegations: delRows,
        quickWins: qwRows,
      },
    });
  } catch (error) {
    console.error("GET /api/principal/catch-up failed:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load catch-up data" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["principal", "admin", "sysadmin"] }),
  { keyPrefix: "principal_catchup", maxRequests: 60 }
);
