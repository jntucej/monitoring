// src/app/api/admin/governance/compliance/overview/route.ts
// GET /api/admin/governance/compliance/overview
// Admin Governance Compliance overview — KPIs & series from data_compliance_logs and consent_records.
//
// Tables:
//   - data_compliance_logs: id, action, details, created_at, updated_at
//   - consent_records: id, user_id, scope, granted_at, revoked_at, version

import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

interface ConsentKpisRow {
  total: number;
  active: number;
  revoked: number;
  unique_users: number;
}

interface ComplianceKpisRow {
  total: number;
  last_30d: number;
}

interface ConsentScopeRow {
  scope: string;
  total: number;
  active: number;
  revoked: number;
}

interface ComplianceDailyRow {
  day: string;
  action: string;
  count: number;
}

interface ConsentDailyRow {
  day: string;
  granted_count: number;
}

interface ComplianceLogRow {
  id: string;
  action: string;
  details: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export const GET = withRateLimit(
  withAuthorization(
    async (_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      const [
        consentKpiRes,
        complianceKpiRes,
        consentScopeRes,
        complianceDailyRes,
        consentDailyRes,
        recentComplianceRes,
      ] = await Promise.all([
        query<ConsentKpisRow>(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE revoked_at IS NULL)::int AS active,
            COUNT(*) FILTER (WHERE revoked_at IS NOT NULL)::int AS revoked,
            COUNT(DISTINCT user_id)::int AS unique_users
          FROM consent_records
        `),
        query<ComplianceKpisRow>(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS last_30d
          FROM data_compliance_logs
        `),
        query<ConsentScopeRow>(`
          SELECT
            scope,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE revoked_at IS NULL)::int AS active,
            COUNT(*) FILTER (WHERE revoked_at IS NOT NULL)::int AS revoked
          FROM consent_records
          GROUP BY scope
          ORDER BY total DESC
        `),
        query<ComplianceDailyRow>(`
          SELECT
            to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
            action,
            COUNT(*)::int AS count
          FROM data_compliance_logs
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY 1, 2
          ORDER BY day ASC
        `),
        query<ConsentDailyRow>(`
          SELECT
            to_char(date_trunc('day', granted_at), 'YYYY-MM-DD') AS day,
            COUNT(*)::int AS granted_count
          FROM consent_records
          WHERE granted_at >= NOW() - INTERVAL '30 days'
          GROUP BY 1
          ORDER BY day ASC
        `),
        query<ComplianceLogRow>(`
          SELECT
            id,
            action,
            details,
            created_at::text AS created_at,
            updated_at::text AS updated_at
          FROM data_compliance_logs
          ORDER BY created_at DESC
          LIMIT 50
        `),
      ]);

      const consentKpi = consentKpiRes.rows[0] ?? { total: 0, active: 0, revoked: 0, unique_users: 0 };
      const complianceKpi = complianceKpiRes.rows[0] ?? { total: 0, last_30d: 0 };
      const consentScope = consentScopeRes.rows;
      const complianceDaily = complianceDailyRes.rows;
      const consentDaily = consentDailyRes.rows;
      const recentCompliance = recentComplianceRes.rows;

      const activePct = consentKpi.total > 0
        ? Math.round((consentKpi.active / consentKpi.total) * 100)
        : 100;

      // Populate items for ComplianceContent.tsx from real compliance log rows
      const items: Array<Record<string, unknown> & { id: string }> = recentCompliance.map((c) => ({
        id: c.id,
        action: c.action,
        details: c.details,
        created_at: c.created_at,
        updated_at: c.updated_at,
      }));

      return ok({
        kpis: {
          total_compliance_events: Number(complianceKpi.total ?? 0),
          compliance_events_30d: Number(complianceKpi.last_30d ?? 0),
          total_consent_records: Number(consentKpi.total ?? 0),
          active_consents: Number(consentKpi.active ?? 0),
          revoked_consents: Number(consentKpi.revoked ?? 0),
          unique_consent_users: Number(consentKpi.unique_users ?? 0),
          consent_compliance_rate_pct: activePct,
        },
        series: {
          compliance_by_day: complianceDaily,
          consent_by_day: consentDaily,
          consent_by_scope: consentScope,
        },
        items,
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60_000, maxRequests: 60 }
);
