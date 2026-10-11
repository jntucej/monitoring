import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/admin/users/enrollment-codes
 * List recently issued enrollment codes joined with their owner.
 * ?active=true returns only unused, unexpired codes; default is the 50
 * most recent regardless of state.
 */
async function handleGet(req: NextRequest, _ctx: { auth: AuthContext }) {
  const activeOnly = req.nextUrl.searchParams.get("active") === "true";

  let sql = `
    SELECT
      ec.id,
      ec.user_id,
      ec.purpose,
      ec.expires_at,
      ec.used_at,
      ec.created_at,
      ec.created_by,
      u.unique_id AS user_roll,
      u.name      AS user_name
    FROM enrollment_codes ec
    LEFT JOIN users u ON u.id = ec.user_id
  `;
  if (activeOnly) {
    sql += ` WHERE ec.used_at IS NULL AND ec.expires_at > NOW()`;
  }
  sql += ` ORDER BY ec.created_at DESC LIMIT 50`;

  try {
    const res = await query(sql);
    const rows = (res as any).rows ?? [];
    return NextResponse.json({
      success: true,
      data: rows.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        user_roll: r.user_roll ?? null,
        user_name: r.user_name ?? null,
        purpose: r.purpose,
        expires_at: r.expires_at,
        used_at: r.used_at,
        created_at: r.created_at,
        created_by: r.created_by,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err?.message || "Failed to list enrollment codes" } },
      { status: 500 }
    );
  }
}

export const GET = withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin"] });
