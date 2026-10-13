import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * Thin, self-scoped "my shift" endpoint for the worker role.
 *
 * Returns { success, data: { myShift, myRecent, openWorkOrders, todayShifts } }
 * — derived from movement_logs and permission_requests (maintenance work
 * items), scoped to the caller's own user id.
 */
async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const myRecent = await query(
      `SELECT id, direction, gate_name, is_manual, timestamp
         FROM movement_logs
        WHERE user_id = $1
        ORDER BY timestamp DESC LIMIT 15`,
      [auth.userId]
    );

    // Work orders / maintenance requests (any open maintenance-typed
    // permission request), plus a today snapshot of this worker's shift.
    const openWorkOrders = await query(
      `SELECT pr.* FROM permission_requests pr
        WHERE pr.workflow_type = 'staff_leave'
          AND pr.status = 'PENDING'
        ORDER BY pr.created_at DESC LIMIT 15`,
      []
    );

    const todayShifts = await query(
      `SELECT u.id, u.name, u.unique_id AS worker_id,
        MIN(CASE WHEN ml.direction = 'IN' THEN ml.timestamp END) AS check_in,
        MAX(CASE WHEN ml.direction = 'OUT' THEN ml.timestamp END) AS check_out,
        COUNT(*) AS scans
        FROM movement_logs ml
        JOIN users u ON u.id = ml.user_id
        WHERE ml.user_id = $1
          AND ml.timestamp >= date_trunc('day', NOW())
        GROUP BY u.id, u.name, u.unique_id`,
      [auth.userId]
    );

    return NextResponse.json({
      success: true,
      data: {
        myRecent: myRecent.rows,
        openWorkOrders: openWorkOrders.rows,
        todayShifts: todayShifts.rows,
      },
    });
  } catch (error) {
    console.error("Worker my-shift fetch error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch worker shift data" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "worker", "supervisor"] }),
  { keyPrefix: "worker_my_shift", maxRequests: 60 }
);
