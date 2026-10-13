import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * Thin, assignment-scoped work-orders endpoint for the worker role.
 *
 * Returns { success, data: { open, recentlyClosed, totalOpen } } — the
 * worker's view of work items assigned to their own user id, plus
 * recently closed ones. Personal / assignment-scoped only: no
 * institutional records of other people.
 */
async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const open = await query(
      `SELECT pr.id, pr.ticket_number AS ticket, pr.workflow_type AS type,
              pr.current_stage AS stage, pr.status, pr.created_at AS createdAt,
              pr.updated_at AS updatedAt,
              u.name AS requesterName, u.unique_id AS requesterId
         FROM permission_requests pr
         LEFT JOIN users u ON u.id = pr.student_user_id
        WHERE pr.student_user_id = $1
          AND pr.status = 'PENDING'
        ORDER BY pr.created_at DESC
        LIMIT 25`,
      [auth.userId]
    );

    const recentlyClosed = await query(
      `SELECT pr.id, pr.ticket_number AS ticket, pr.status, pr.updated_at AS updatedAt
         FROM permission_requests pr
        WHERE pr.student_user_id = $1
          AND pr.status IN ('COMPLETED', 'APPROVED')
          AND pr.updated_at >= NOW() - INTERVAL '7 days'
        ORDER BY pr.updated_at DESC
        LIMIT 15`,
      [auth.userId]
    );

    const totalOpenRes = await query(
      `SELECT COUNT(*)::int AS c FROM permission_requests
        WHERE student_user_id = $1 AND status = 'PENDING'`,
      [auth.userId]
    );

    return NextResponse.json({
      success: true,
      data: {
        open: open.rows,
        recentlyClosed: recentlyClosed.rows,
        totalOpen: totalOpenRes.rows[0]?.c ?? 0,
      },
    });
  } catch (error) {
    console.error("Worker work-orders fetch error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch work orders" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "worker", "supervisor"] }),
  { keyPrefix: "worker_my_work_orders", maxRequests: 60 }
);
