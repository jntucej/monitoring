import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * Thin, self-scoped "my duties" endpoint for the staff role.
 *
 * Returns { success, data: { myRecent, openRequests, dutyRoster } } — all
 * derived from tables already readable at the staff tier, scoped to the
 * caller's own user id (identity comes from the trusted auth context, never
 * the client).
 */
async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const myRecent = await query(
      `SELECT * FROM movement_logs
        WHERE user_id = $1
        ORDER BY timestamp DESC LIMIT 15`,
      [auth.userId]
    );

    const openRequests = await query(
      `SELECT pr.* FROM permission_requests pr
        WHERE pr.workflow_type = 'staff_leave'
          AND pr.student_user_id = $1
        ORDER BY pr.created_at DESC LIMIT 15`,
      [auth.userId]
    );

    // Today's duty roster: staff users sharing the same gate as this caller
    // who were inside at least one gate today.
    const rosterRes = await query(
      `SELECT DISTINCT u.id, u.name, u.role
        FROM movement_logs ml
        JOIN users u ON u.id = ml.user_id
        WHERE ml.direction = 'IN'
          AND ml.timestamp >= date_trunc('day', NOW())
          AND u.role = 'staff'
        ORDER BY u.name LIMIT 50`,
      []
    );

    return NextResponse.json({
      success: true,
      data: {
        myRecent: myRecent.rows,
        openRequests: openRequests.rows,
        dutyRoster: rosterRes.rows,
      },
    });
  } catch (error) {
    console.error("Staff my-day fetch error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch staff duty data" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "staff", "hod", "supervisor", "faculty"] }),
  { keyPrefix: "staff_my_day", maxRequests: 60 }
);
