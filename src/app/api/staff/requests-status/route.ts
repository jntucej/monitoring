import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/staff/requests-status — the caller's own permission requests,
 * scoped to their own staff id (identity from the trusted auth context).
 *
 * Self-scoped mirror of GET /api/permissions: a staff caller cannot read the
 * unscoped queue, so this returns only their own open + decided tickets.
 * Returns { success, data, total } — the shape the staff request-status page
 * destructures.
 */
async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const workflowType = req.nextUrl.searchParams.get("workflow_type") || req.nextUrl.searchParams.get("workflowType");

    const sql = `
      SELECT * FROM permissions
      WHERE requester_user_id = $1
        ${workflowType ? "AND workflow_type = $2" : ""}
      ORDER BY created_at DESC
      LIMIT 50`;
    const params: unknown[] = [auth.userId];
    if (workflowType) params.push(workflowType);

    const res = await query(sql, params);
    return NextResponse.json({ success: true, data: res.rows, total: res.rows.length });
  } catch (error) {
    console.error("Staff requests-status fetch error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch request status" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "staff", "faculty"] }),
  { keyPrefix: "staff_requests_status", maxRequests: 60 }
);
