// src/app/api/admin/people/overview/route.ts
// PEOPLE faceted-table dashboard: user counts by role + state, new-this-week,
// suspended, and a cohort retention grid (admission year x quarter, cells =
// % active). All reads use the server-side Postgres pool (`query` from
// @/lib/postgres), NOT Supabase.
//
// Column values confirmed against existing admin routes + database/schema.sql:
//   - users.status  -> 'ACTIVE' | 'SUSPENDED' | 'LOCKED' | 'DISABLED' | 'DEPROVISIONED'
//   - users.role    -> text free value
//   - users.created_at (timestamptz)
//
// admin-scoped: requiredRole ['sysadmin','admin'].

import { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";

/** First positional row value coerced to a number; 0 on no rows / drift. */
function num(rows: Array<Record<string, unknown>>): number {
  const v = rows[0]?.count;
  return typeof v === "number" ? v : 0;
}

export const GET = withRateLimit(
  withAuthorization(
    async (_req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      const [
        roleStateRows,
        totalsRows,
        newWeekRows,
        suspendedRows,
        cohortRows,
        tableRows,
      ] = await Promise.all([
        // role -> status counts (all roles).
        query(`
          SELECT role, status, COUNT(*) AS count
          FROM users
          GROUP BY role, status
          ORDER BY role, status
        `).then((r) => r.rows),

        // Global totals: total / active.
        query(`
          SELECT
            COUNT(*)                                   AS total,
            COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active
          FROM users
        `).then((r) => r.rows),

        // New this week: created_at within the last 7 days.
        query(
          `SELECT COUNT(*) AS count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`
        ).then((r) => r.rows),

        // Suspended: status = 'SUSPENDED'.
        query(`SELECT COUNT(*) AS count FROM users WHERE status = 'SUSPENDED'`).then(
          (r) => r.rows
        ),

        // Cohort retention: admission year x quarter of created_at.
        // active_pct = % of that cohort still ACTIVE; -1 for empty cohorts.
        query(`
          WITH cohort AS (
            SELECT
              EXTRACT(YEAR FROM created_at)::int   AS admission_year,
              CASE
                WHEN EXTRACT(QUARTER FROM created_at) = 1 THEN 'Q1'
                WHEN EXTRACT(QUARTER FROM created_at) = 2 THEN 'Q2'
                WHEN EXTRACT(QUARTER FROM created_at) = 3 THEN 'Q3'
                ELSE 'Q4'
              END AS quarter,
              COUNT(*)                                   AS total,
              COUNT(*) FILTER (WHERE status = 'ACTIVE')   AS active
            FROM users
            WHERE created_at IS NOT NULL
            GROUP BY 1, 2
          )
          SELECT
            admission_year,
            quarter,
            CASE WHEN total > 0 THEN ROUND(active::numeric / total * 100, 1)::int ELSE -1 END AS active_pct
          FROM cohort
          ORDER BY admission_year ASC, quarter
        `).then((r) => r.rows),

        // Table rows (capped).
        query(`
          SELECT
            u.id,
            u.name,
            u.email,
            u.role,
            u.status,
            u.created_at::text AS created_at
          FROM users u
          ORDER BY u.created_at DESC
          LIMIT 200
        `).then((r) => r.rows),
      ]);

      // role -> state -> count facet.
      const roleState: Record<string, Record<string, number>> = {};
      const byRole: Record<string, number> = {};
      const byState: Record<string, number> = {};
      for (const row of roleStateRows as Array<{ role: string; status: string; count: number }>) {
        const role = String(row.role ?? "unknown");
        const state = String(row.status ?? "UNKNOWN");
        const n = Number(row.count ?? 0);
        if (!roleState[role]) roleState[role] = {};
        roleState[role][state] = (roleState[role][state] ?? 0) + n;
        byRole[role] = (byRole[role] ?? 0) + n;
        byState[state] = (byState[state] ?? 0) + n;
      }

      const t = totalsRows[0] ?? {};
      const total = Number(t.total ?? 0);
      const active = Number(t.active ?? 0);
      const suspended = num(suspendedRows);
      const newThisWeek = num(newWeekRows);
      const activePct = total > 0 ? active / total : null;

      // Cohort grid -> dense [yearIdx][quarterIdx] matrix.
      const cohortYears: string[] = [];
      const quarters = ["Q1", "Q2", "Q3", "Q4"];
      const qIdx = new Map(quarters.map((q, i) => [q, i]));
      for (const c of cohortRows as Array<{ admission_year: number; quarter: string; active_pct: number }>) {
        const y = String(c.admission_year ?? "");
        if (!cohortYears.includes(y)) cohortYears.push(y);
      }
      const yIdx = new Map(cohortYears.map((y, i) => [y, i]));
      const grid: number[][] = cohortYears.map(() => quarters.map(() => -1));
      for (const c of cohortRows as Array<{ admission_year: number; quarter: string; active_pct: number }>) {
        const ri = yIdx.get(String(c.admission_year ?? ""));
        const ci = qIdx.get(String(c.quarter ?? ""));
        if (ri != null && ci != null) grid[ri][ci] = Number(c.active_pct ?? -1);
      }

      // Table rows.
      const rows = (tableRows as Array<Record<string, unknown>>).map((r) => ({
        id: String(r.id ?? ""),
        name: String(r.name ?? ""),
        email: String(r.email ?? ""),
        role: String(r.role ?? ""),
        state: String(r.status ?? ""),
        two_factor_enabled: false,
        created_at: String(r.created_at ?? ""),
        cohort_active_pct: 0,
      }));
      // Fill cohort_active_pct per row (admission year + quarter of created_at).
      for (const row of rows) {
        try {
          const d = new Date(row.created_at);
          if (Number.isNaN(d.getTime())) continue;
          const y = String(d.getFullYear());
          const m = d.getMonth() + 1;
          const q = m <= 3 ? "Q1" : m <= 6 ? "Q2" : m <= 9 ? "Q3" : "Q4";
          const ri = yIdx.get(y);
          const ci = qIdx.get(q);
          if (ri != null && ci != null && grid[ri][ci] >= 0) {
            row.cohort_active_pct = grid[ri][ci];
          }
        } catch {
          /* ignore parse errors */
        }
      }

      const payload = {
        total,
        byRole,
        byState,
        roleState,
        active,
        newThisWeek,
        suspended,
        activePct,
        cohortGrid: {
          years: cohortYears,
          semesters: quarters,
          data: grid,
        },
        rows,
      };

      return ok(payload);
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60_000, maxRequests: 60 }
);
