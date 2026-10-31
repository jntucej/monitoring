// src/app/api/admin/governance/audit/overview/route.ts
// GET /api/admin/governance/audit/overview
// Admin Governance Audit overview — count by action per day (last 7 days),
// KPIs { total, unique_users, high_risk_actions }, and recent audit event log.
//
// Table: audit_logs
// Columns: id, action, user_id, user_name, user_role, details, ip_address, user_agent, timestamp, gate_id

import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

/**
 * High-risk action set defined from actual actions present in audit_logs:
 * Privileged administrative mutations, security config changes, credential modifications,
 * and bulk operations that alter system integrity:
 * - USER_DELETED, USER_DEACTIVATED: user deletion and deactivation
 * - ROLE_CHANGED, ACCOUNT_STATUS_CHANGED: privilege elevation / state shifts
 * - BULK_USER_IMPORT: mass user creation / updates
 * - SECURITY_SETTINGS_UPDATE, SSO_CONFIG_UPDATE, DEVICE_SETTING_UPDATED: security and device configuration modifications
 * - RETENTION_CLEANUP: irreversible data purge
 * - ADMIN_EXPORT: mass exfiltration of sensitive platform data
 * - SESSION_FORCE_REVOKED: administrative session termination
 * - PASSWORD_CHANGED: credential rotation
 * - MANUAL_ENTRY_AUTHORIZED: manual bypass of security gates
 * - ENROLLMENT_CODE_ISSUED: privileged onboarding token generation
 */
export const HIGH_RISK_ACTIONS = [
  "USER_DELETED",
  "USER_DEACTIVATED",
  "ROLE_CHANGED",
  "ACCOUNT_STATUS_CHANGED",
  "BULK_USER_IMPORT",
  "SECURITY_SETTINGS_UPDATE",
  "SSO_CONFIG_UPDATE",
  "DEVICE_SETTING_UPDATED",
  "RETENTION_CLEANUP",
  "ADMIN_EXPORT",
  "SESSION_FORCE_REVOKED",
  "PASSWORD_CHANGED",
  "MANUAL_ENTRY_AUTHORIZED",
  "ENROLLMENT_CODE_ISSUED",
] as const;

interface AuditKpisRow {
  total: number;
  unique_users: number;
  high_risk_actions: number;
}

interface ActionDailyCountRow {
  day: string;
  action: string;
  count: number;
}

interface AuditLogRow {
  id: string;
  action: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  details: unknown;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
  gate_id: string | null;
}

export const GET = withRateLimit(
  withAuthorization(
    async (_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      const [kpiRes, dailyActionsRes, recentLogsRes] = await Promise.all([
        query<AuditKpisRow>(
          `
          SELECT
            COUNT(*)::int AS total,
            COUNT(DISTINCT user_id)::int AS unique_users,
            COUNT(*) FILTER (WHERE action = ANY($1))::int AS high_risk_actions
          FROM audit_logs
          WHERE timestamp >= NOW() - INTERVAL '7 days'
          `,
          [HIGH_RISK_ACTIONS as unknown as string[]]
        ),
        query<ActionDailyCountRow>(`
          SELECT
            to_char(date_trunc('day', timestamp), 'YYYY-MM-DD') AS day,
            action,
            COUNT(*)::int AS count
          FROM audit_logs
          WHERE timestamp >= NOW() - INTERVAL '7 days'
          GROUP BY 1, 2
          ORDER BY day ASC, count DESC
        `),
        query<AuditLogRow>(`
          SELECT
            id::text,
            action,
            user_id::text,
            user_name,
            user_role,
            details,
            ip_address,
            user_agent,
            timestamp::text AS timestamp,
            gate_id::text
          FROM audit_logs
          ORDER BY timestamp DESC
          LIMIT 100
        `),
      ]);

      const kpiRow = kpiRes.rows[0];
      const dailyActions = dailyActionsRes.rows;
      const recentLogs = recentLogsRes.rows;

      return ok({
        kpis: {
          total: Number(kpiRow?.total ?? 0),
          unique_users: Number(kpiRow?.unique_users ?? 0),
          high_risk_actions: Number(kpiRow?.high_risk_actions ?? 0),
        },
        by_action_per_day: dailyActions,
        high_risk_actions_defined: HIGH_RISK_ACTIONS,
        items: recentLogs,
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60_000, maxRequests: 60 }
);
