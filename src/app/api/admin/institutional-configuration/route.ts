import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/admin/institutional-configuration
 *
 * Read-only institutional settings snapshot: workflow defaults, role policy
 * config, pass types, exit reasons, retention policies, and core system
 * settings. Writes require sysadmin.
 */

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const [
      passTypes,
      exitReasons,
      retention,
      systemSettings,
      rolePolicy,
      college,
    ] = await Promise.all([
      query<{ code: string; name: string; requires_approval: boolean; approval_flow: string | null; is_active: boolean }>(
        `SELECT code, name, requires_approval, approval_flow, is_active
           FROM public.config_pass_types ORDER BY code`
      ),
      query<{ code: string; name: string; is_active: boolean }>(
        `SELECT code, name, is_active FROM public.config_exit_reasons ORDER BY code`
      ),
      query<{ id: string; data_category: string; retention_days: number; auto_delete: boolean }>(
        `SELECT id, data_category, retention_days, auto_delete
           FROM public.retention_policies ORDER BY data_category`
      ),
      query<{ id: string; value: unknown; updated_at: string }>(
        `SELECT id, value, updated_at FROM public.system_settings ORDER BY id`
      ),
      query<{ code: string; display_name: string; permissions: unknown; is_active: boolean }>(
        `SELECT code, display_name, permissions, is_active
           FROM public.config_roles WHERE is_active = TRUE ORDER BY code`
      ),
      query<{ name: string | null; short_name: string | null; accreditation: string | null }>(
        `SELECT name, short_name, accreditation FROM public.config_college_info LIMIT 1`
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        pass_types: passTypes.rows,
        exit_reasons: exitReasons.rows,
        retention_policies: retention.rows,
        system_settings: systemSettings.rows,
        role_policy: rolePolicy.rows,
        college: college.rows.length ? college.rows[0] : null,
        note: "Editing institutional configuration requires sysadmin access.",
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
  { keyPrefix: "admin_institutional_config", maxRequests: 60 }
);
