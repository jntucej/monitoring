import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/admin/workflow-configuration
 *
 * Read-only per-pass-type workflow definitions: stages, document
 * requirements, approval-flow hints, SLAs and volume. Editing requires
 * sysadmin.
 */

interface PassTypeRow {
  code: string;
  name: string;
  requires_approval: boolean;
  approval_flow: string | null;
  is_active: boolean;
}

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const [passTypes, workflowStats, passVolume] = await Promise.all([
      query<PassTypeRow>(
        `SELECT code, name, requires_approval, approval_flow, is_active
           FROM public.config_pass_types ORDER BY code`
      ),
      query<{
        workflow_type: string;
        current_stage: string;
        open: number;
        pending: number;
        completed: number;
        rejected: number;
        last_active: string | null;
      }>(
        `SELECT
           pr.workflow_type,
           MAX(pr.current_stage) AS current_stage,
           COUNT(*) FILTER (WHERE pr.status = 'PENDING')::int AS open,
           COUNT(*) FILTER (WHERE pr.status IN ('PENDING','ESCALATED'))::int AS pending,
           COUNT(*) FILTER (WHERE pr.status IN ('APPROVED','COMPLETED'))::int AS completed,
           COUNT(*) FILTER (WHERE pr.status = 'REJECTED')::int AS rejected,
           MAX(pr.updated_at) AS last_active
          FROM public.permission_requests pr
          GROUP BY pr.workflow_type
          ORDER BY pr.workflow_type`
      ),
      query<{ pass_type: string; total: number; pending: number }>(
        `SELECT
           COALESCE(p.pass_type, 'unknown') AS pass_type,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE p.status = 'pending')::int AS pending
          FROM public.passes p
          GROUP BY COALESCE(p.pass_type, 'unknown')
          ORDER BY total DESC`
      ),
    ]);

    const data = passTypes.rows.map((pt) => {
      const wf = workflowStats.rows.find((w) => w.workflow_type === pt.code);
      const vol = passVolume.rows.find((v) => v.pass_type === pt.code);
      return {
        ...pt,
        sla_hours: 48,
        volume_total: vol?.total ?? 0,
        volume_pending: vol?.pending ?? 0,
        workflow: wf
          ? {
              current_stage: wf.current_stage,
              open: wf.open,
              pending: wf.pending,
              completed: wf.completed,
              rejected: wf.rejected,
              last_active: wf.last_active,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        pass_types: data,
        workflow_stats: workflowStats.rows,
        note: "Editing workflow definitions requires sysadmin access.",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: msg } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "admin_workflow_config", maxRequests: 60 }
);
