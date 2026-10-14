// src/app/api/admin/audit-logs/route.ts
// Campus-split audit trail for the admin console.
//
// Distinct from /api/admin/audit (sysadmin/platform trail) in two ways:
//   1. It filters OUT infra-noise action prefixes (auth_, mfa_, session_,
//      backup_, retention_, db_migration, api_metrics, security_, rls_)
//      so admins see operational campus events, not plumbing.
//   2. It supports a scope parameter:
//        ?scope=campus  (default) -> current admin's view of campus events
//        ?scope=all      -> sysadmin-only; the full unfiltered trail
//      "all" is gated on the caller's DB role (not a JWT claim), verified
//      against the users table so a spoofed/absent claim cannot escalate.
//
// Filters: action, from, to, userId, page, pageSize
// Response: { items, total, page, pageSize }

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

const PAGE_SIZE_MAX = 200;
const PAGE_SIZE_DEFAULT = 50;

// Infra-noise prefixes the admin campus trail excludes (case-insensitive).
const INFRA_PREFIXES = [
  "auth_",
  "mfa_",
  "session_",
  "backup_",
  "retention_",
  "db_migration",
  "api_metrics",
  "security_",
  "rls_",
];

function isInfraAction(action: string | null | undefined): boolean {
  if (!action) return false;
  const a = action.toLowerCase();
  return INFRA_PREFIXES.some((p) => a.startsWith(p));
}

/**
 * Verify the caller's DB role. "all" scope requires sysadmin; the role is
 * read from the users table (not the JWT claim) so privilege is re-confirmed
 * server-side on every request.
 */
async function callerDbRole(userId: string): Promise<string | null> {
  try {
    const res = await query("SELECT role FROM users WHERE id = $1 LIMIT 1", [userId]);
    const row = res.rows[0];
    return row && typeof row.role === "string" ? row.role : null;
  } catch {
    return null;
  }
}

async function handleGet(
  req: NextRequest,
  { auth }: { auth: { userId: string } }
) {
  const params = req.nextUrl.searchParams;

  const scope = params.get("scope") || "campus";
  const action = params.get("action") || undefined;
  const from = params.get("from") || undefined;
  const to = params.get("to") || undefined;
  const userId = params.get("userId") || undefined;

  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const pageSizeRaw = parseInt(params.get("pageSize") || String(PAGE_SIZE_DEFAULT), 10);
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, Number.isNaN(pageSizeRaw) ? PAGE_SIZE_DEFAULT : pageSizeRaw)
  );

  // "all" scope: verify the caller is actually a sysadmin in the DB.
  if (scope === "all") {
    const dbRole = await callerDbRole(auth.userId);
    if (dbRole !== "sysadmin") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "scope=all requires the sysadmin role",
          },
        },
        { status: 403 }
      );
    }
  }

  const where: string[] = [];
  const values: (string | number | null)[] = [];

  // Campus scope excludes infra-noise actions; "all" returns the raw trail.
  if (scope !== "all") {
    // Build a NOT-STARTS-WITH filter for each infra prefix.
    const infraClauses = INFRA_PREFIXES.map((p) => {
      values.push(p);
      return `lower(action) NOT LIKE $${values.length}`;
    });
    where.push(`(${infraClauses.join(" AND ")})`);
  }

  if (action) {
    values.push(action);
    where.push(`action = $${values.length}`);
  }
  if (from) {
    values.push(from);
    where.push(`timestamp >= $${values.length}`);
  }
  if (to) {
    values.push(to);
    where.push(`timestamp <= $${values.length}`);
  }
  if (userId) {
    values.push(userId);
    where.push(`user_id = $${values.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const offset = (page - 1) * pageSize;

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM audit_logs ${whereClause}`,
    [...values]
  );
  const total = countRes.rows[0]?.total ?? 0;

  values.push(pageSize, offset);
  const rowsRes = await query(
    `SELECT id, action, user_id, user_name, user_role, details, ip_address, user_agent, timestamp
     FROM audit_logs ${whereClause}
     ORDER BY timestamp DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    [...values]
  );

  const items = rowsRes.rows.map((row: Record<string, unknown>) => {
    const rawDetails = row.details;
    let details: Record<string, unknown> = {};
    if (typeof rawDetails === "string") {
      try {
        details = JSON.parse(rawDetails);
      } catch {
        details = { raw: rawDetails };
      }
    } else if (rawDetails && typeof rawDetails === "object") {
      details = rawDetails as Record<string, unknown>;
    }
    return {
      id: row.id,
      action: row.action,
      userId: row.user_id,
      userName: row.user_name,
      userRole: row.user_role,
      details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      timestamp: row.timestamp,
    };
  });

  // Defense in depth: drop any infra rows that slipped through (e.g. an
  // explicit action filter that named an infra action).
  const effectiveItems =
    scope !== "all"
    ? items.filter((item) => !isInfraAction(typeof item.action === "string" ? item.action : null))
      : items;

  return NextResponse.json({
    success: true,
    items: effectiveItems,
    total,
    page,
    pageSize,
  });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "admin_audit_logs", maxRequests: 300 }
);
