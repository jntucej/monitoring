import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/admin/permission-policies
 *
 * Read-only view of the permission workflow configuration: workflow types,
 * stage definitions, SLA hints and per-workflow volume. Editing these
 * definitions requires sysadmin access (system_settings + role policy
 * writes are gated separately).
 */

interface WorkflowConfig {
  workflow_type: string;
  current_stage: string;
  document_required: boolean;
  open_count: number;
  pending_count: number;
  last_seen: string | null;
  first_seen: string | null;
}

interface StageSample {
  workflow_type: string;
  stage: string;
  open: number;
}

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const [workflows, stageRows] = await Promise.all([
      query<WorkflowConfig>(
        `SELECT
           pr.workflow_type,
           MAX(pr.current_stage) AS current_stage,
           MAX(pr.document_required) AS document_required,
           COUNT(*) FILTER (WHERE pr.status = 'PENDING')::int AS open_count,
           COUNT(*) FILTER (WHERE pr.status IN ('PENDING','ESCALATED'))::int AS pending_count,
           MAX(pr.created_at) AS last_seen,
           MIN(pr.created_at) AS first_seen
          FROM public.permission_requests pr
          GROUP BY pr.workflow_type
          ORDER BY pr.workflow_type`
      ),
      query<StageSample>(
        `SELECT
           pr.workflow_type,
           pr.current_stage AS stage,
           COUNT(*)::int AS open
          FROM public.permission_requests pr
          WHERE pr.status IN ('PENDING', 'ESCALATED')
          GROUP BY pr.workflow_type, pr.current_stage
          ORDER BY pr.workflow_type, COUNT(*) DESC`
      ),
    ]);

    // Per-workflow stage map
    const stagesByWorkflow = new Map<string, { stage: string; open: number }[]>();
    for (const row of stageRows.rows) {
      const list = stagesByWorkflow.get(row.workflow_type) ?? [];
      list.push({ stage: row.stage, open: row.open });
      stagesByWorkflow.set(row.workflow_type, list);
    }

    const data = workflows.rows.map((wf) => ({
      workflow_type: wf.workflow_type,
      current_stage: wf.current_stage,
      document_required: wf.document_required,
      open_count: wf.open_count,
      pending_count: wf.pending_count,
      last_seen: wf.last_seen,
      first_seen: wf.first_seen,
      stages: stagesByWorkflow.get(wf.workflow_type) ?? [],
      sla_hours: 48,
      approver_roles: ["hod", "principal", "vice_principal"],
    }));

    const roles = await query<{ code: string; permissions: unknown }>(
      `SELECT code, permissions FROM public.config_roles WHERE is_active = TRUE ORDER BY code`
    );

    return NextResponse.json({
      success: true,
      data: {
        workflows: data,
        roles: roles.rows,
        note: "Editing permission workflow definitions requires sysadmin access.",
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
  { keyPrefix: "admin_permission_policies", maxRequests: 60 }
);
