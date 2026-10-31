// src/app/api/admin/access/overview/route.ts
// ACCESS & IDENTITY GOVERNANCE overview: user totals & role distribution,
// unrevoked active sessions, and multi-role assignment counts.
//
// Tables:
//   - users      (COUNT, role distribution, distinct roles count)
//   - sessions   (unrevoked session count: revoked_at IS NULL)
//   - user_roles (multi-role count: users assigned > 1 role)
//
// Real vs stubbed:
//   - totalUsers: REAL (COUNT(*) from users)
//   - activeSessions: REAL (COUNT(*) from sessions WHERE revoked_at IS NULL)
//   - rolesUsed: REAL (count of distinct roles assigned/in use across users)
//   - mfaCoverage: 0 (MFA subsystem has been removed/deferred in this deployment;
//     mfaCoverage remains constant 0 without synthesizing artificial data)
//   - roleDistribution: REAL (role -> count map)
//   - multiRoleUsers: REAL (count of users with multiple roles in user_roles)
//
// admin-scoped: requiredRole ['sysadmin', 'admin'].

import { type NextRequest } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { QueryResultRow } from "pg";

interface TotalUsersRow extends QueryResultRow {
  total?: number | string | null;
}

interface RoleCountRow extends QueryResultRow {
  role: string | null;
  count?: number | string | null;
}

interface SessionsCountRow extends QueryResultRow {
  count?: number | string | null;
}

interface MultiRoleCountRow extends QueryResultRow {
  count?: number | string | null;
}

async function safeQuery<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const res = await query<T>(text, params as never[]);
    return res.rows ?? [];
  } catch (err: unknown) {
    // Only swallow missing table error (42P01); re-throw real failures so connection/auth issues don't fake zero data
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "42P01"
    ) {
      return [];
    }
    throw err;
  }
}

export const GET = withRateLimit(
  withAuthorization(
    async (req: NextRequest, ctx: { auth: AuthContext }): Promise<Response> => {
      void req;
      void ctx;

      const [
        totalUsersRows,
        roleDistRows,
        activeSessionsRows,
        multiRoleRows,
      ] = await Promise.all([
        // users COUNT
        safeQuery<TotalUsersRow>(`SELECT COUNT(*)::int AS total FROM users`),

        // users role distribution
        safeQuery<RoleCountRow>(`
          SELECT role, COUNT(*)::int AS count
          FROM users
          GROUP BY role
          ORDER BY count DESC
        `),

        // sessions unrevoked count
        safeQuery<SessionsCountRow>(`
          SELECT COUNT(*)::int AS count
          FROM sessions
          WHERE revoked_at IS NULL
        `),

        // user_roles multi-role count
        safeQuery<MultiRoleCountRow>(`
          SELECT COUNT(*)::int AS count
          FROM (
            SELECT user_id
            FROM user_roles
            GROUP BY user_id
            HAVING COUNT(*) > 1
          ) multi
        `),
      ]);

      const totalUsers = Number(totalUsersRows[0]?.total ?? 0);

      const roleDistribution: Record<string, number> = {};
      for (const row of roleDistRows) {
        if (row.role) {
          roleDistribution[row.role] = Number(row.count ?? 0);
        }
      }
      const rolesUsed = Object.keys(roleDistribution).length;

      const activeSessions = Number(activeSessionsRows[0]?.count ?? 0);
      const multiRoleUsers = Number(multiRoleRows[0]?.count ?? 0);

      return ok({
        totalUsers,
        activeSessions,
        rolesUsed,
        mfaCoverage: 0,
        roleDistribution,
        multiRoleUsers,
      });
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { keyPrefix: "admin_access_overview", windowMs: 60_000, maxRequests: 60 }
);
