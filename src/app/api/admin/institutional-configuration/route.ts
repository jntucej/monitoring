import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/admin/institutional-configuration
 *
 * Combined snapshot for the admin institutional-configuration hub:
 *  - Editable (admin): collegeInfo, passTypes, exitReasons
 *  - Read-only (sysadmin-only): retentionPolicies, systemSettings (security keys), roleRegistry
 */

const SECURITY_SETTING_KEYS = [
  "session_timeout_minutes",
  "max_login_attempts",
  "security_level",
  "audit_retention_days",
  "notifications_enabled",
] as const;

/** Maps SECURITY_SETTING_KEYS to the JSONB field in system_settings → global_settings */
const KEY_TO_FIELD: Record<string, string> = {
  session_timeout_minutes: "sessionTimeoutMinutes",
  max_login_attempts: "maxLoginAttempts",
  security_level: "securityLevel",
  audit_retention_days: "auditRetentionDays",
  notifications_enabled: "notificationsEnabled",
};

async function handleGet(_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> {
  try {
    const [collegeInfo, passTypes, exitReasons, retention, systemSettings, globalSettings, roleRegistry] =
      await Promise.all([
        query<{
          name: string | null;
          short_name: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          logo: string | null;
          accreditation: string | null;
          website: string | null;
          principal: string | null;
          updated_at: string | null;
        }>(
          `SELECT name, short_name, address, phone, email, logo,
                  accreditation, website, principal, updated_at
             FROM public.config_college_info LIMIT 1`
        ),
        query<{
          code: string;
          name: string;
          requires_approval: boolean;
          approval_flow: string | null;
          is_active: boolean;
        }>(
          `SELECT code, name, requires_approval, approval_flow, is_active
             FROM public.config_pass_types ORDER BY code`
        ),
        query<{
          code: string;
          name: string;
          description: string | null;
          applicable_to: string[] | null;
          requires_approval: boolean;
          approval_by: string | null;
          parent_notification: string | null;
          max_duration_hours: number | null;
          is_active: boolean;
        }>(
          `SELECT code, name, description, applicable_to, requires_approval,
                  approval_by, parent_notification, max_duration_hours, is_active
             FROM public.config_exit_reasons ORDER BY code`
        ),
        query<{ id: string; data_category: string; retention_days: number; auto_delete: boolean }>(
          `SELECT id, data_category, retention_days, auto_delete
             FROM public.retention_policies ORDER BY data_category`
        ),
        query<{ id: string; value: unknown; updated_at: string }>(
          `SELECT id, value, updated_at
             FROM public.system_settings
             WHERE id IN (${SECURITY_SETTING_KEYS.map((_, i) => `$${i + 1}`).join(", ")})
             ORDER BY id`,
          [...SECURITY_SETTING_KEYS]
        ),
        query<{ key: string; value: unknown; updated_at: string }>(
          `SELECT key, value, updated_at FROM public.system_config WHERE key = 'global_settings'`
        ),
        query<{
          code: string;
          display_name: string;
          description: string | null;
          permissions: unknown;
          is_active: boolean;
        }>(
          `SELECT code, display_name, description, permissions, is_active
             FROM public.config_roles WHERE is_active = TRUE ORDER BY code`
        ),
      ]);

    // Build the security-posture snapshot from global_settings JSONB,
    // falling back to individual system_settings keys if present.
    const globalRow = globalSettings.rows[0] as any;
    const globalValue: Record<string, unknown> =
      (globalRow?.value ?? globalRow?.data ?? {}) as Record<string, unknown>;
    const securityPosture: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(KEY_TO_FIELD)) {
      if (field in globalValue) {
        securityPosture[key] = globalValue[field];
      } else {
        const individual = systemSettings.rows.find((r) => r.id === key);
        if (individual) securityPosture[key] = individual.value;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        collegeInfo: collegeInfo.rows[0] ?? null,
        passTypes: passTypes.rows,
        exitReasons: exitReasons.rows,
        retentionPolicies: retention.rows,
        systemSettings: systemSettings.rows,
        securityPosture,
        roleRegistry: roleRegistry.rows,
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
