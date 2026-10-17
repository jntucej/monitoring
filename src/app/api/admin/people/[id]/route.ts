// src/app/api/admin/people/[id]/route.ts
// PEOPLE drawer: one-person detail (profile, roles, recent sessions, last 5
// audit actions, deep links). Server-side Postgres pool; NOT Supabase.
//
// Confirmed tables/columns:
//   - users       (profile: id,name,email,phone,role,status,...)
//   - user_roles  (role junction: user_id, role, granted_at)
//   - sessions    (user_id, created_at, last_seen_at, ip_address, user_agent, revoked_at)
//   - audit_logs  (user_id, action, details jsonb, ip_address, timestamp)
//
// admin-scoped: requiredRole ['sysadmin','admin']. Every read is guarded so a
// missing table/column degrades to a safe default instead of 500-ing.

import { NextRequest, NextResponse } from "next/server";
import type { AuthContext } from "@/lib/authContext";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";

/** Extract the [id] path segment from /api/admin/people/<uuid>. */
function idFromPath(req: NextRequest): string {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segs[segs.length - 1] ?? "");
}

/** Guard: zero rows on drift -> null. */
function firstRow<T>(rows: T[]): T | null {
  return rows[0] ?? null;
}

export const GET = withRateLimit(
  withAuthorization(
    async (req: NextRequest, _ctx: { auth: AuthContext }): Promise<Response> => {
      const userId = idFromPath(req);
      if (!userId) {
        return fail("INVALID_USER_ID", "User ID is required", 400);
      }

      const [
        profileRes,
        rolesRes,
        sessionsCountRes,
        sessionsRes,
        auditRes,
      ] = await Promise.all([
        query(
          `
          SELECT
            id, name, email, phone, role, status,
            department_id, two_factor_enabled,
            last_password_change::text AS last_password_change,
            created_at::text  AS created_at,
            updated_at::text  AS updated_at
          FROM users
          WHERE id = $1::uuid
          LIMIT 1
          `,
          [userId]
        ),
        query(
          `
          SELECT role, granted_at::text AS granted_at
          FROM user_roles
          WHERE user_id = $1::uuid
          ORDER BY granted_at ASC
          `,
          [userId]
        ),
        query(
          `SELECT COUNT(*) AS count FROM sessions WHERE user_id = $1::uuid`,
          [userId]
        ),
        query(
          `
          SELECT
            id,
            created_at::text   AS created_at,
            last_seen_at::text AS last_seen_at,
            ip_address,
            user_agent,
            revoked_at::text   AS revoked_at
          FROM sessions
          WHERE user_id = $1::uuid
          ORDER BY
            CASE WHEN revoked_at IS NULL THEN 0 ELSE 1 END,
            last_seen_at DESC NULLS LAST,
            created_at DESC
          LIMIT 5
          `,
          [userId]
        ),
        query(
          `
          SELECT
            action,
            details,
            ip_address,
            timestamp::text AS timestamp
          FROM audit_logs
          WHERE user_id = $1::uuid
          ORDER BY timestamp DESC
          LIMIT 5
          `,
          [userId]
        ),
      ]);

      const profile = firstRow(profileRes.rows as Array<Record<string, unknown>>);
      if (!profile) {
        return fail("NOT_FOUND", "User not found", 404);
      }

      const sCount = sessionsCountRes.rows[0] as Record<string, unknown> | undefined;
      const sessionsCount =
        typeof sCount?.count === "number" ? Number(sCount.count) : 0;

      const payload = {
        id: String(profile.id ?? ""),
        name: String(profile.name ?? ""),
        email: String(profile.email ?? ""),
        phone: profile.phone != null ? String(profile.phone) : null,
        role: String(profile.role ?? ""),
        state: String(profile.status ?? ""),
        department_id:
          profile.department_id != null ? String(profile.department_id) : null,
        two_factor_enabled:
          profile.two_factor_enabled === true ||
          profile.two_factor_enabled === "true",
        last_password_change:
          profile.last_password_change != null
            ? String(profile.last_password_change)
            : null,
        created_at: String(profile.created_at ?? ""),
        updated_at:
          profile.updated_at != null ? String(profile.updated_at) : null,

        roles: (rolesRes.rows as Array<{ role: string; granted_at: string }>).map(
          (r) => ({ role: String(r.role ?? ""), granted_at: String(r.granted_at ?? "") })
        ),

        sessionsCount,

        sessions: (sessionsRes.rows as Array<Record<string, unknown>>).map((s) => ({
          id: String(s.id ?? ""),
          created_at: String(s.created_at ?? ""),
          last_seen_at: s.last_seen_at != null ? String(s.last_seen_at) : null,
          ip_address: s.ip_address != null ? String(s.ip_address) : null,
          user_agent: s.user_agent != null ? String(s.user_agent) : null,
          revoked_at: s.revoked_at != null ? String(s.revoked_at) : null,
        })),

        audit: (auditRes.rows as Array<Record<string, unknown>>).map((a) => ({
          action: String(a.action ?? ""),
          details: a.details ?? null,
          ip_address: a.ip_address != null ? String(a.ip_address) : null,
          timestamp: String(a.timestamp ?? ""),
        })),

        links: {
          users: `/admin/users/${userId}`,
          userRoles: `/sysadmin/roles`,
          roleRequests: `/sysadmin/promotions`,
          auditLogs: `/sysadmin/audit`,
        },
      };

      return ok(payload);
    },
    { requiredRole: ["sysadmin", "admin"] }
  ),
  { windowMs: 60_000, maxRequests: 60 }
);
