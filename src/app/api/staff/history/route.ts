import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/staff/history — the caller's own gate movement history, scoped
 * to their own staff id (identity from the trusted auth context, never the
 * client). Replaces the shared /api/staff/attendance fetch on the staff
 * history page, which rendered the whole-staff roster instead of the
 * caller's own movement log.
 *
 * Returns { success, data, total } — the shape the history page destructures.
 */
async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 50), 100);

    const res = await query(
      `SELECT id, user_id, direction, gate_name, timestamp, reason, is_correction
         FROM movement_logs
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT $2`,
      [auth.userId, limit]
    );
    return NextResponse.json({
      success: true,
      data: res.rows,
      total: res.rows.length,
    });
  } catch (error) {
    console.error("Staff history fetch error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch movement history" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "staff", "faculty"] }),
  { keyPrefix: "staff_history", maxRequests: 60 }
);
