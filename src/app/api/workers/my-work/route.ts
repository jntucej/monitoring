import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * Thin, assignment-scoped "my work" endpoint for the worker role.
 *
 * Returns { success, data: { tasks, completedLastWeek, todayShift } } — the
 * worker's open + recently completed maintenance work orders and today's
 * shift snapshot, all scoped to the caller's own user id.
 *
 * Work items are tracked as permission_requests filed BY the worker
 * (requester_user_id = worker uuid). A maintenance duty is expressed as a
 * permission request the worker raises (cleaning round, repair, etc.).
 * The legacy student_user_id alias on the view points at the student who
 * requested a hostel/exam pass and is NOT the worker, so it was wrong
 * here; switched to requester_user_id, which is the authoritative owner
 * column on the base table.
 */
async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    // Assignment-scoped: work items filed/owned by the caller's user id only.
    // No institutional movement records of other persons.
    const openTasks = await query(
      `SELECT id, ticket_number AS ticket, workflow_type AS type,
              current_stage AS stage, status, created_at AS createdAt
         FROM permission_requests
        WHERE requester_user_id = $1
          AND status = 'PENDING'
          AND created_at >= NOW() - INTERVAL '30 days'
        ORDER BY created_at DESC
        LIMIT 20`,
      [auth.userId]
    );

    const completed = await query(
      `SELECT COUNT(*)::int AS c FROM permission_requests
        WHERE requester_user_id = $1
          AND status IN ('COMPLETED','APPROVED')
          AND updated_at >= NOW() - INTERVAL '7 days'`,
      [auth.userId]
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
