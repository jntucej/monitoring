import { NextRequest, NextResponse } from "next/server";
import { findAllStudents, searchStudents, getParentChildren } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

async function handleGet(req: NextRequest) {
  try {
    const authRole = req.headers.get("x-user-role");
    const authUserId = req.headers.get("x-user-id");
    if (!authRole || !authUserId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const params = req.nextUrl.searchParams;
    const q = params.get("q");
    const parentId = params.get("parentId");

    // Parents can only list their own children
    if (parentId) {
      if (authRole !== "admin" && authRole !== "sysadmin" && authUserId !== parentId) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "You can only access your own linked students." } },
          { status: 403 }
        );
      }
      const children = await getParentChildren(parentId);
      return NextResponse.json({ success: true, data: children });
    }

    // Only admins/sysadmins may list the full roster
    if (authRole !== "admin" && authRole !== "sysadmin") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to list students." } },
        { status: 403 }
      );
    }

    const data = q ? await searchStudents(q) : await findAllStudents();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load students" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "parent"] }),
  { keyPrefix: "students_list", maxRequests: 100 }
);
