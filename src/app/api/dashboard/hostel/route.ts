import { NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";

/**
 * GET /api/dashboard/hostel — boys/girls pending, stage funnel, overdue
 * tickets, and biometric completion for the hostel command center.
 */
async function handleGet() {
  const [countsRes, stageRes, overdueRes, bioRes] = await Promise.all([
    // Pending hostel tickets split by gender
    query(
      `SELECT
         COUNT(*) FILTER (WHERE sd.student_type IN ('HM')) AS boys_pending,
         COUNT(*) FILTER (WHERE sd.student_type IN ('HF')) AS girls_pending,
         COUNT(*) AS pending
       FROM permissions p
       LEFT JOIN users u ON u.id = p.requester_user_id
       LEFT JOIN student_details sd ON sd.user_id = u.id
      WHERE p.workflow_type = 'hostel'
        AND p.status IN ('PENDING','ESCALATED')`
    ).catch(() => ({ rows: [{ boys_pending: 0, girls_pending: 0, pending: 0 }] })),
    // Stage funnel
    query(
      `SELECT p.current_stage AS stage, COUNT(*)::int AS count
         FROM permissions p
        WHERE p.workflow_type = 'hostel'
          AND p.status IN ('PENDING','ESCALATED')
        GROUP BY p.current_stage`
    ).catch(() => ({ rows: [] as unknown[] })),
    // Overdue hostel tickets
    query(
      `SELECT p.ticket_number AS ticket,
              u.name AS student,
              p.current_stage AS stage,
              GREATEST(0, ROUND(EXTRACT(EPOCH FROM (NOW() - p.sla_deadline)) / 3600.0))::int AS age_hours
         FROM permissions p
         LEFT JOIN users u ON u.id = p.requester_user_id
        WHERE p.workflow_type = 'hostel'
          AND p.status IN ('PENDING','ESCALATED')
          AND p.sla_deadline IS NOT NULL
          AND p.sla_deadline < NOW()
        ORDER BY p.sla_deadline ASC
        LIMIT 10`
    ).catch(() => ({ rows: [] as unknown[] })),
    // Biometric completion
    query(
      `SELECT
         COUNT(*) FILTER (WHERE sd.student_type IN ('HM','HF')) AS hostel_total,
         COUNT(*) FILTER (WHERE sd.student_type IN ('HM','HF') AND u.biometric_hostel_at IS NOT NULL) AS hostel_done,
         (SELECT COUNT(*) FROM users WHERE role = 'operator') AS gate_total,
         (SELECT COUNT(*) FROM users WHERE role = 'operator' AND biometric_gate_at IS NOT NULL) AS gate_done
         FROM student_details sd
         LEFT JOIN users u ON u.id = sd.user_id`
    ).catch(() => ({ rows: [{ hostel_total: 0, hostel_done: 0, gate_total: 0, gate_done: 0 }] })),
  ]);

  const c = countsRes.rows[0];
  const bio = bioRes.rows[0];
  const stageCounts: Record<string, number> = {};
  for (const row of stageRes.rows as Array<{ stage: string; count: number }>) {
    stageCounts[row.stage] = row.count;
  }

  return NextResponse.json({
    success: true,
    data: {
      pending: c?.pending ?? 0,
      boysPending: c?.boys_pending ?? 0,
      girlsPending: c?.girls_pending ?? 0,
      completedToday: 0,
      stageCounts,
      overdue: overdueRes.rows as unknown[],
      biometric: {
        hostelDone: bio?.hostel_done ?? 0,
        hostelTotal: bio?.hostel_total ?? 0,
        gateDone: bio?.gate_done ?? 0,
        gateTotal: bio?.gate_total ?? 0,
      },
    },
  });
}

export const GET = withRateLimit(
  withAuthorization(handleGet as never, { requiredRole: ["admin", "sysadmin", "principal", "vice_principal"] }),
  { keyPrefix: "dashboard_hostel", maxRequests: 60 }
);
