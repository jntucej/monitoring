import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * Thin, assignment-scoped "my work" endpoint for the worker role.
 *
 * Returns { success, data: { tasks, completedLastWeek, todayShift } } — the
 * worker's open + recently completed maintenance work orders (from
 * permission_requests) and today's shift snapshot, all scoped to the
 * caller's own user id. No institutional movement records of others.
 */
async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const openTasks = await query(
      `SELECT id, ticket_number AS ticket, workflow_type AS type,
              current_stage AS stage, status, created_at AS createdAt
         FROM permission_requests
        WHERE workflow_type = 'staff_leave'
          AND status = 'PENDING'
          AND created_at >= NOW() - INTERVAL '30 days'
        ORDER BY created_at DESC
        LIMIT 20`,
      []
    );

    const completed = await query(
      `SELECT COUNT(*)::int AS c FROM permission_requests
        WHERE workflow_type = 'staff_leave' AND status IN ('COMPLETED','APPROVED')
          AND updated_at >= NOW() - INTERVAL '7 days'`,
      []
    );

    const todayShift = await query(
      `SELECT MIN(CASE WHEN direction = 'IN' THEN timestamp END) AS checkIn,
              MAX(CASE WHEN direction = 'OUT' THEN timestamp END) AS checkOut,
              COUNT(*)::int AS scans
         FROM movement_logs
        WHERE user_id = $1
          AND timestamp >= date_trunc('day', NOW())`,
      [auth.userId]
    );

    return NextResponse.json({
      success: true,
      data: {
        tasks: openTasks.rows,
        completedLastWeek: completed.rows[0]?.c ?? 0,
        todayShift: todayShift.rows[0] ?? null,
      },
    });
  } catch (error) {
    console.error("Worker my-work fetch error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch worker tasks" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "worker", "supervisor"] }),
  { keyPrefix: "worker_my_work", maxRequests: 60 }
);
