import { NextRequest, NextResponse } from "next/server";
import { getDbClient } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(req: NextRequest, context: { auth: any }) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const isHod = context.auth?.isHod;
    const hodDeptId = context.auth?.departmentId;

    let departmentId = searchParams.get("departmentId");

    if (isHod && hodDeptId) {
      departmentId = hodDeptId;
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
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "faculty"] }),
  { keyPrefix: "hod_faculty", maxRequests: 30 }
);