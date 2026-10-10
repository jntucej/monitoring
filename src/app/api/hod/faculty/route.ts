import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient as getDbClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(req: NextRequest, context: { auth: any }) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const authRole = context.auth?.role;
    const isAdmin = ["admin", "sysadmin"].includes(authRole);
    const callerDeptId = context.auth?.departmentId || context.auth?.department;

    let departmentId = searchParams.get("departmentId");

    if (!isAdmin) {
      if (!callerDeptId) {
        return NextResponse.json(
          { success: false, error: "Department scope missing for non-admin caller." },
          { status: 403 }
        );
      }
      // Force strict scoping to caller's department
      departmentId = callerDeptId;
    }

    let query = getDbClient()
      .from("users")
      .select("*, employee_details(*)")
      .eq("role", "faculty");

    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: "Failed to fetch faculty" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "faculty", "hod"] }),
  { keyPrefix: "hod_faculty", maxRequests: 30 }
);