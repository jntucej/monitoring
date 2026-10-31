// src/app/api/admin/data/overview/route.ts
// GET /api/admin/data/overview
// Admin Data lifecycle overview: retention policies, backups, compliance logs.
//
// Tables:
//   - retention_policies (all rows)
//   - backups (COUNT + MAX(created_at) + recent list)
//   - data_compliance_logs (last 30 days)

import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

interface RetentionPolicyRow {
  id: string;
  data_category: string;
  retention_days: number;
  auto_delete: boolean;
  created_at: string | null;
  updated_at: string | null;
}

interface BackupStatsRow {
  count: number;
  last_backup_at: string | null;
}

interface BackupRecentRow {
  id: string;
  filename: string;
  created_at: string;
  size: number;
  table_count: number;
  record_count: number;
  status: string;
  checksum: string | null;
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
        retentionRes,
        backupStatsRes,
        recentBackupsRes,
        complianceLogsRes,
      ] = await Promise.all([
        query<RetentionPolicyRow>(`
          SELECT
            id,
            data_category,
            retention_days,
            auto_delete,
            created_at::text AS created_at,
            updated_at::text AS updated_at
          FROM retention_policies
          ORDER BY created_at DESC
        `),
        query<BackupStatsRow>(`
          SELECT
            COUNT(*)::int AS count,
            MAX(created_at)::text AS last_backup_at
          FROM backups
        `),
        query<BackupRecentRow>(`
          SELECT
            id,
            filename,
            created_at::text AS created_at,
            size::int AS size,
            table_count,
            record_count,
            status,
            checksum
          FROM backups
          ORDER BY created_at DESC
          LIMIT 10
        `),
        query<ComplianceLogRow>(`
          SELECT
            id,
            action,
            details,
            created_at::text AS created_at,
            updated_at::text AS updated_at
          FROM data_compliance_logs
          WHERE created_at >= NOW() - INTERVAL '30 days'
          ORDER BY created_at DESC
          LIMIT 50
        `),
      ]);

      const retentionPolicies = retentionRes.rows;
      const backupStats = backupStatsRes.rows[0] ?? { count: 0, last_backup_at: null };
      const recentBackups = recentBackupsRes.rows;
      const complianceLogs = complianceLogsRes.rows;

      // Populate items with real records so scaffold consumers have typed entries with id.
      const items: Array<Record<string, unknown> & { id: string }> =
        retentionPolicies.length > 0
          ? retentionPolicies.map((p) => ({
              id: p.id,
              category: p.data_category,
              retention_days: p.retention_days,
              auto_delete: p.auto_delete,
              created_at: p.created_at,
              updated_at: p.updated_at,
            }))
          : complianceLogs.map((c) => ({
              id: c.id,
              action: c.action,
              details: c.details,
              created_at: c.created_at,
              updated_at: c.updated_at,
            }));

      return ok({
        retention_policies: retentionPolicies,
        backups: {
          count: Number(backupStats.count ?? 0),
          last_backup_at: backupStats.last_backup_at ?? null,
          recent: recentBackups,
        },
        data_compliance_logs: complianceLogs,
        items,
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60_000, maxRequests: 60 }
);
