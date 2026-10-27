import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/exam/access
 *
 * Read-only endpoint for exam operations: who is currently authorised for
 * exam access (exam-workflow permission requests at each stage), plus the
 * exam_superintendent clearance desk counts.
 *
 * Query params:
 *   limit — max rows (default 100, max 200)
 *
 * Role-gated server-side: exam_superintendent / exam_branch / oie /
 * vice_principal / principal / admin / sysadmin only.
 */
async function handleGet(
  req: NextRequest,
  _context: { auth: AuthContext }
) {
  try {
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "100", 10), 200);

    // Authorised (or pending) exam access — one row per request, joined to candidate + stage owner
    const sql = `
      SELECT
        pr.id,
        pr.ticket_number,
        pr.current_stage,
        pr.status,
        pr.sla_deadline,
        pr.created_at,
        pr.updated_at,
        u.id AS candidate_user_id,
        u.name AS candidate_name,
        u.unique_id AS candidate_unique_id,
        sd.roll
      FROM public.permission_requests pr
      JOIN public.users u ON u.id = pr.student_user_id
      LEFT JOIN public.student_details sd ON sd.user_id = u.id
      WHERE pr.workflow_type = 'exam'
        AND pr.status IN ('PENDING', 'APPROVED', 'ESCALATED')
      ORDER BY
        CASE WHEN pr.status = 'PENDING' THEN 0 ELSE 1 END,
        pr.updated_at DESC
      LIMIT $1`;
    const rows = await query(sql, [limit]);

    // Clearance desk counts by stage (superintendent oversight)
    const stageSql = `
      SELECT current_stage, status, COUNT(*)::int AS count
      FROM public.permission_requests
      WHERE workflow_type = 'exam'
        AND current_stage IS NOT NULL
      GROUP BY current_stage, status
      ORDER BY count DESC
      LIMIT 50`;
    const stageRes = await query(stageSql);

    return NextResponse.json({
      success: true,
      data: {
        authorised: rows.rows,
        stageSummary: stageRes.rows,
      },
      total: rows.rows.length,
    });
  } catch (error) {
    console.error("Exam access fetch error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load exam access data" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/exam/access  — set the exam-day gate state.
 * Body: { open: boolean } → access_state = open ? "open" : "closed".
 * Role-gated (same allowlist as GET). Persists to exam_day_state.
 */
async function handlePost(_req: NextRequest, context: { auth: AuthContext }) {
  try {
    const open = Boolean(_req && (_req as any).open);
    const state = open ? "open" : "closed";
    await query(
      `INSERT INTO exam_day_state (day, access_state, updated_by, updated_at)
       VALUES (CURRENT_DATE, $1, $2, NOW())
       ON CONFLICT (day) DO UPDATE SET access_state = EXCLUDED.access_state,
         updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [state, context.auth?.userId ?? null]
    );
    return NextResponse.json({ success: true, data: { day: state } });
  } catch (error) {
    console.error("Exam access state update error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update exam day state" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, {
    requiredRole: ["exam_superintendent", "exam_branch", "oie", "vice_principal", "principal", "admin", "sysadmin"],
  }),
  { keyPrefix: "exam_access", maxRequests: 60 }
);

export const POST = withRateLimit(
  withAuthorization(handlePost, {
    requiredRole: ["exam_superintendent", "exam_branch", "oie", "vice_principal", "principal", "admin", "sysadmin"],
  }),
  { keyPrefix: "exam_access_set", maxRequests: 20 }
);
