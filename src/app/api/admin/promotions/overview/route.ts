// src/app/api/admin/promotions/overview/route.ts
// PROMOTIONS kanban dashboard: status counts, per-column rows, a from-role →
// to-role transition matrix, and median time-to-decision.
//
// Reads the real `role_change_requests` table via the server-side Postgres
// pool (`query` from @/lib/postgres), NOT Supabase. Confirmed values:
//   - role_change_requests.status      -> 'PENDING' | 'APPROVED' | 'REJECTED'
//   - role_change_requests.requested_role (text)
//   - role_change_requests.target_user_id -> users.id
//   - users.role (current role snapshot) used as the "from-role"
//
// admin-scoped: requiredRole ['sysadmin','admin']. Every read is guarded so a
// missing table/column degrades to a safe default instead of 500-ing.

import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type {
  SankeyNode,
  SankeyLink,
} from "@/components/sysadmin/kit/viz";

type Status = "PENDING" | "APPROVED" | "REJECTED";

/** Median of a number list; 0 when empty. */
function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export const GET = withRateLimit(
  withAuthorization(
    async (_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      // ----------------------------------------------------------------
      // KPI status counts (PENDING / APPROVED-this-month / REJECTED).
      // ----------------------------------------------------------------
      let pending = 0;
      let approvedThisMonth = 0;
      let rejected = 0;
      try {
        const res = await query(`
          SELECT
            COUNT(*) FILTER (WHERE status = 'PENDING')  AS pending,
            COUNT(*) FILTER (WHERE status = 'APPROVED'
                     AND created_at >= date_trunc('month', NOW())) AS approved_this_month,
            COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected
          FROM role_change_requests
        `);
        const r = res.rows[0] as
          | { pending: number; approved_this_month: number; rejected: number }
          | undefined;
        pending = Number(r?.pending ?? 0);
        approvedThisMonth = Number(r?.approved_this_month ?? 0);
        rejected = Number(r?.rejected ?? 0);
      } catch {
        /* leave 0/0/0 */
      }

      // ----------------------------------------------------------------
      // Per-column rows (capped 60 each) joined to users for name + role.
      // ----------------------------------------------------------------
      async function columnRows(status: Status, order: "ASC" | "DESC") {
        const res = await query(
          `
          SELECT
            r.id,
            r.target_user_id,
            u.name         AS target_user_name,
            u.role         AS target_user_role,
            r.requested_role,
            r.status,
            r.created_at::text  AS created_at,
            r.updated_at::text  AS updated_at,
            a.name           AS approver_name,
            CASE
              WHEN r.status = 'PENDING' THEN NULL
              ELSE GREATEST(0, EXTRACT(EPOCH FROM (r.updated_at - r.created_at))::bigint)
            END AS decision_seconds
          FROM role_change_requests r
          LEFT JOIN users u ON u.id = r.target_user_id
          LEFT JOIN users a ON a.id = r.approved_by
          WHERE r.status = $1
          ORDER BY r.created_at ${order}
          LIMIT 60
          `,
          [status],
        );
        return (res.rows as Array<Record<string, unknown>>).map((x) => ({
          id: String(x.id ?? ""),
          target_user_id: String(x.target_user_id ?? ""),
          target_user_name:
            x.target_user_name != null ? String(x.target_user_name) : null,
          target_user_role:
            x.target_user_role != null ? String(x.target_user_role) : null,
          requested_role: String(x.requested_role ?? ""),
          status,
          created_at: String(x.created_at ?? ""),
          updated_at: String(x.updated_at ?? ""),
          approver_name:
            x.approver_name != null ? String(x.approver_name) : null,
          decision_seconds:
            x.decision_seconds != null ? Number(x.decision_seconds) : null,
        }));
      }

      let columns: Record<Status, Awaited<ReturnType<typeof columnRows>>> = {
        PENDING: [],
        APPROVED: [],
        REJECTED: [],
      };
      try {
        columns = {
          PENDING: await columnRows("PENDING", "ASC"),
          APPROVED: await columnRows("APPROVED", "DESC"),
          REJECTED: await columnRows("REJECTED", "DESC"),
        };
      } catch {
        /* leave empty columns */
      }

      // ----------------------------------------------------------------
      // Median time-to-decision across APPROVED + REJECTED, in hours.
      // ----------------------------------------------------------------
      let medianTimeToDecisionH = 0;
      try {
        const res = await query(`
          SELECT EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600.0 AS hours
          FROM role_change_requests
          WHERE status IN ('APPROVED','REJECTED')
            AND updated_at IS NOT NULL
            AND created_at  IS NOT NULL
            AND updated_at >= created_at
        `);
        const hours = (res.rows as Array<{ hours: unknown }>)
          .map((r) => Number(r.hours))
          .filter((n) => Number.isFinite(n) && n >= 0);
        medianTimeToDecisionH = median(hours);
      } catch {
        /* leave 0 */
      }

      // ----------------------------------------------------------------
      // From-role -> to-role transition matrix (APPROVED requests only).
      // source = target user's CURRENT role; target = requested_role.
      // ----------------------------------------------------------------
      const transitions: { from_role: string; to_role: string; count: number }[] =
        [];
      const sankey: {
        source: SankeyNode[];
        target: SankeyNode[];
        links: SankeyLink[];
      } = { source: [], target: [], links: [] };
      try {
        const res = await query(`
          SELECT
            COALESCE(u.role, 'unknown') AS from_role,
            r.requested_role            AS to_role,
            COUNT(*)::int               AS count
          FROM role_change_requests r
          LEFT JOIN users u ON u.id = r.target_user_id
          WHERE r.status = 'APPROVED'
            AND r.requested_role IS NOT NULL
          GROUP BY COALESCE(u.role, 'unknown'), r.requested_role
          HAVING COUNT(*) > 0
          ORDER BY count DESC
        `);
        const sourceCount = new Map<string, number>();
        const targetCount = new Map<string, number>();
        for (const row of res.rows as Array<{
          from_role: string;
          to_role: string;
          count: number;
        }>) {
          const from = String(row.from_role ?? "unknown");
          const to = String(row.to_role ?? "unknown");
          const n = Number(row.count ?? 0);
          if (n <= 0) continue;
          transitions.push({ from_role: from, to_role: to, count: n });
          sourceCount.set(from, (sourceCount.get(from) ?? 0) + n);
          targetCount.set(to, (targetCount.get(to) ?? 0) + n);
          sankey.links.push({ source: from, target: to, value: n });
        }
        sankey.source = Array.from(sourceCount.entries()).map(([id, count]) => ({
          id,
          label: id,
          count,
        }));
        sankey.target = Array.from(targetCount.entries()).map(([id, count]) => ({
          id,
          label: id,
          count,
        }));
      } catch {
        /* leave empty */
      }

      const payload = {
        pending,
        approved_this_month: approvedThisMonth,
        rejected,
        median_time_to_decision_h: medianTimeToDecisionH,
        columns,
        transitions,
        sankey,
      };

      return ok(payload);
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60_000, maxRequests: 60 }
);
