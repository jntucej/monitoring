import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * Thin, personal-scoped history endpoint for the worker role.
 *
 * Returns { success, data: { shifts, recentWork, totals } } — the
 * worker's own past shift days (check-in/out pairs from their own
 * movement logs), recently completed work items, and summary counts.
 * Strictly the caller's own data: worker permissions are based on
 * assigned duties only, so no institutional movement records of others.
 */
async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const daysParam = req.nextUrl.searchParams.get("days");
    const days = daysParam ? Math.min(90, Math.max(1, Number(daysParam))) : 30;

    const shifts = await query(
      `SELECT to_char(date_trunc('day', timestamp), 'YYYY-MM-DD') AS day,
              MIN(CASE WHEN direction = 'IN' THEN timestamp END) AS checkIn,
              MAX(CASE WHEN direction = 'OUT' THEN timestamp END) AS checkOut,
              COUNT(*)::int AS scans,
              COUNT(DISTINCT gate_id) FILTER (WHERE gate_id IS NOT NULL) AS gates
         FROM movement_logs
        WHERE user_id = $1
          AND timestamp >= date_trunc('day', NOW()) - ($2 || ' days')::interval
        GROUP BY to_char(date_trunc('day', timestamp), 'YYYY-MM-DD')
        ORDER BY day DESC
        LIMIT 90`,
      [auth.userId, days]
    );

    const completed = await query(
      `SELECT pr.id, pr.ticket_number AS ticket, pr.status, pr.updated_at AS updatedAt
         FROM permission_requests pr
        WHERE pr.student_user_id = $1
          AND pr.status IN ('COMPLETED','APPROVED')
        ORDER BY pr.updated_at DESC
        LIMIT 20`,
      [auth.userId]
    );

    const totalsRes = await query(
      `SELECT COUNT(*)::int AS totalDays,
              COUNT(CASE WHEN direction = 'IN' THEN 1 END)::int AS checkIns,
              COUNT(CASE WHEN direction = 'OUT' THEN 1 END)::int AS checkOuts
         FROM movement_logs
        WHERE user_id = $1
          AND timestamp >= date_trunc('day', NOW()) - ($2 || ' days')::interval`,
      [auth.userId, days]
    );

    return NextResponse.json({
      success: true,
      data: {
        days: days,
        shifts: shifts.rows,
        recentlyCompleted: completed.rows,
        totals: totalsRes.rows[0] ?? null,
      },
    });
  } catch (error) {
    console.error("Worker personal-history fetch error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch personal history" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "worker", "supervisor"] }),
  { keyPrefix: "worker_personal_history", maxRequests: 60 }
);
