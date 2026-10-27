import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/supervisor/assignees
 *
 * Thin read-only endpoint returning the operator + supervisor roster that a
 * supervisor can route alerts to. Only includes users with a non-null name.
 *
 * Response:
 *   {
 *     success: true,
 *     data: [{ id, name, role }]
 *   }
 *
 * Supervisor-tier only.
 */
interface AssigneeRow {
  id: string;
  name: string;
  role: string;
}

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const allowed: string[] = ["supervisor", "admin", "sysadmin", "principal"];
    if (!allowed.includes(auth.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Forbidden" } },
        { status: 403 }
      );
    }

    const rows: AssigneeRow[] = (
      await query<AssigneeRow>(
        `SELECT id, name, role
           FROM users
          WHERE role IN ('operator', 'supervisor')
            AND name IS NOT NULL
            AND status = 'ACTIVE'
          ORDER BY role, name ASC
          LIMIT 100`
      )
    ).rows;

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error("[supervisor/assignees] error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load assignees." } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, {
    requiredRole: ["supervisor", "admin", "sysadmin", "principal"],
  }),
  { keyPrefix: "supervisor_assignees", maxRequests: 30 }
);

export const dynamic = "force-dynamic";
