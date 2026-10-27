import { NextRequest, NextResponse } from "next/server";
import { err } from "@/lib/api-response";
import { getSupabaseServiceClient as getDbClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/faculty — list all faculty members (id, name, role, department,
 * employee_details) for admin/sysadmin roster & assignment pickers.
 *
 * Mirrors /api/hod/faculty but without the department filter (admin scope):
 * returns every active faculty user so the Faculty Assignments console's
 * dropdowns can be populated.
 */
async function handleGet(req: NextRequest, context: { auth: any }) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const departmentId = searchParams.get("departmentId") || undefined;

    let query = getDbClient()
      .from("users")
      .select("*, employee_details(*)")
      .eq("role", "faculty");

    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(err("INTERNAL_ERROR", "Failed to fetch faculty").body, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(err("INTERNAL_ERROR", "Internal server error").body, { status: 500 });
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "hod", "faculty", "staff"] }),
  { keyPrefix: "faculty_list", maxRequests: 30 },
);
