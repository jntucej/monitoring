import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/exam/access-exceptions
 *
 * Read-only endpoint for the OIE role: lists access exceptions (rejected,
 * escalated, or SLA-breached exam permission requests) by joining
 * permission_requests with users / student_details.
 *
 * Query params:
 *   limit  — max rows (default 50, max 200)
 *   status — PENDING|APPROVED|REJECTED|ESCALATED|COMPLETED|CANCELLED (optional)
 *
 * Scoped to oie / admin / sysadmin / principal roles.
 */
async function handleGet(
  req: NextRequest,
  { auth }: { auth: AuthContext }
) {
  try {
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") || "50", 10),
      200
    );
    const statusParam = req.nextUrl.searchParams.get("status");

    // Build WHERE clause
    const conditions: string[] = [
      "pr.workflow_type = 'exam'",
      "(pr.status = 'REJECTED' OR pr.status = 'ESCALATED' OR pr.status = 'PENDING')",
      "pr.current_stage IN ('oie', 'exam_branch', 'hod')",
    ];

    if (statusParam && ["PENDING", "APPROVED", "REJECTED", "ESCALATED", "COMPLETED", "CANCELLED"].includes(statusParam)) {
      conditions.push(`pr.status = '${statusParam}'`);
    }

    const sql = `
      SELECT
        pr.id,
        pr.ticket_number,
        pr.workflow_type,
        pr.current_stage,
        pr.status,
        pr.sla_deadline,
        pr.created_at,
        pr.updated_at,
        pr.stage_history,
        u.name AS candidate_name,
        u.unique_id AS candidate_unique_id,
        sd.roll_number AS roll
      FROM public.permission_requests pr
      JOIN public.users u ON u.id = pr.student_user_id
      LEFT JOIN public.student_details sd ON sd.student_id = u.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY
        CASE WHEN pr.sla_deadline IS NOT NULL AND pr.sla_deadline < NOW() THEN 0 ELSE 1 END,
        pr.updated_at DESC
      LIMIT $1`;

    const result = await query(sql, [limit]);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Exam access-exceptions fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch access exceptions",
        },
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, {
    requiredRole: ["oie", "admin", "sysadmin", "principal", "vice_principal"],
  }),
  { keyPrefix: "exam_access_exceptions", maxRequests: 60 }
);
