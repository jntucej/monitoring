import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/exam/candidate-attendance
 *
 * Read-only endpoint for the OIE role: lists recent exam candidate
 * attendance records from the attendance_records table, joined to
 * users for name / roll number.
 *
 * Query params:
 *   limit  — max rows (default 50, max 200)
 *   date   — YYYY-MM-DD filter on attendance_records.date (optional)
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
    const dateParam = req.nextUrl.searchParams.get("date");

    const sql = dateParam
      ? `SELECT ar.*, u.name AS candidate_name, u.unique_id AS candidate_unique_id,
                sd.roll_number AS roll
           FROM public.attendance_records ar
           JOIN public.users u ON u.id = ar.person_id
           LEFT JOIN public.student_details sd ON sd.student_id = u.id
          WHERE ar.date = $1
          ORDER BY ar.timestamp_utc DESC
          LIMIT $2`
      : `SELECT ar.*, u.name AS candidate_name, u.unique_id AS candidate_unique_id,
                sd.roll_number AS roll
           FROM public.attendance_records ar
           JOIN public.users u ON u.id = ar.person_id
           LEFT JOIN public.student_details sd ON sd.student_id = u.id
          WHERE ar.direction IN ('IN','OUT')
          ORDER BY ar.timestamp_utc DESC
          LIMIT $1`;

    const params = dateParam ? [dateParam, limit] : [limit];
    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Exam candidate-attendance fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch candidate attendance",
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
  { keyPrefix: "exam_candidate_attendance", maxRequests: 60 }
);
