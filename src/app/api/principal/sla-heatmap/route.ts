import { NextRequest, NextResponse } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/principal/sla-heatmap — SLA compliance heatmap by stage.
 *
 * Returns:
 * - cells: array of { stage, total, withinSla, breached, rate }
 * - byWorkflowType: heatmap keyed by workflow_type → stage → { total, withinSla, breached }
 */
async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    // For all pending tickets, compute whether they are within SLA
    const { rows: stageRows } = await query(
      `SELECT p.current_stage AS stage,
              p.workflow_type,
              COUNT(*)::int AS total,
              SUM(CASE WHEN p.sla_deadline >= now() THEN 1 ELSE 0 END)::int AS within_sla,
              SUM(CASE WHEN p.sla_deadline < now() THEN 1 ELSE 0 END)::int AS breached
         FROM permissions p
        WHERE p.status = 'PENDING'
          AND p.current_stage IS NOT NULL
          AND p.current_stage <> ''
        GROUP BY p.current_stage, p.workflow_type
        HAVING p.current_stage IN ('principal', 'warden_or_principal', 'hod',
                                   'deputy_warden', 'hostel_manager', 'caretaker',
                                   'oie', 'exam_branch')
        ORDER BY p.current_stage, p.workflow_type`
    );

    // Aggregate by stage only (across all workflow types)
    const byStage = new Map<string, { total: number; withinSla: number; breached: number }>();
    for (const r of stageRows as Array<{ stage: string; total: number; within_sla: number; breached: number }>) {
      const existing = byStage.get(r.stage) ?? { total: 0, withinSla: 0, breached: 0 };
      existing.total += r.total;
      existing.withinSla += r.within_sla;
      existing.breached += r.breached;
      byStage.set(r.stage, existing);
    }

    const cells = Array.from(byStage.entries()).map(([stage, v]) => ({
      stage,
      total: v.total,
      withinSla: v.withinSla,
      breached: v.breached,
      rate: v.total > 0 ? Math.round((v.withinSla / v.total) * 100) : 100,
    }));

    return NextResponse.json({
      success: true,
      data: {
        cells,
        details: stageRows,
      },
    });
  } catch (error) {
    console.error("GET /api/principal/sla-heatmap failed:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load SLA heatmap" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["principal", "admin", "sysadmin"] }),
  { keyPrefix: "principal_sla_heatmap", maxRequests: 30 }
);
