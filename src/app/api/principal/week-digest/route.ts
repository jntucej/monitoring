import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/principal/week-digest — summary of campus activity for the last 7 days.
 *
 * Returns:
 * - totalPending: pending tickets
 * - totalApproved: approvals cleared this week
 * - totalEscalated: escalations received this week
 * - byWorkflowType: counts per workflow_type
 * - byDay: day-by-day activity (for sparkline)
 */
async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const { rows: pending } = await query(
      `SELECT COUNT(*)::int AS count FROM permissions WHERE status = 'PENDING'`
    );

    const { rows: approved } = await query(
      `SELECT COUNT(*)::int AS count
       FROM permissions
       WHERE status IN ('APPROVED', 'REJECTED')
         AND updated_at > now() - INTERVAL '7 days'`
    );

    const { rows: escalated } = await query(
      `SELECT COUNT(*)::int AS count
       FROM permissions
       WHERE status = 'PENDING'
         AND forwarded_from_role IS NOT NULL
         AND updated_at > now() - INTERVAL '7 days'`
    );

    const { rows: byType } = await query(
      `SELECT workflow_type, COUNT(*)::int AS count
         FROM permissions
        WHERE created_at > now() - INTERVAL '7 days'
        GROUP BY workflow_type`
    );

    const { rows: byDay } = await query(
      `SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int AS count
         FROM permissions
        WHERE created_at > now() - INTERVAL '7 days'
        GROUP BY date_trunc('day', created_at)
        ORDER BY day`
    );

    // Build a 7-day series with zero-filled days
    const now = new Date();
    const dayMap = new Map(byDay.map((r: any) => [String(r.day), r.count]));
    const series: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      series.push({
        label: d.toLocaleDateString([], { weekday: "short" }),
        count: dayMap.get(key) ?? 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalPending: pending[0]?.count ?? 0,
        totalApproved: approved[0]?.count ?? 0,
        totalEscalated: escalated[0]?.count ?? 0,
        byWorkflowType: byType,
        series,
      },
    });
  } catch (error) {
    console.error("GET /api/principal/week-digest failed:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load week digest" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["principal", "admin", "sysadmin"] }),
  { keyPrefix: "principal_weekdigest", maxRequests: 60 }
);
