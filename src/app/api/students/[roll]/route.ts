import { NextRequest, NextResponse } from "next/server";
import { findStudentByRoll, getStudentHistory, getStudentStatus } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/dbClient";

/**
 * Extract the [roll] dynamic segment from the request URL.
 * This avoids needing Next.js route context which doesn't propagate
 * through our middleware wrappers.
 */
function getRoll(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // URL pattern: /api/students/:roll
  return decodeURIComponent(segments[segments.length - 1]);
}

async function handleGet(req: NextRequest) {
  try {
    const roll = getRoll(req);
    const authUserId = req.headers.get("x-user-id");
    const authRole = req.headers.get("x-user-role");

    // Authorization Check
    const isAllowedRole = ["admin", "sysadmin"].includes(authRole || "");

    if (!isAllowedRole) {
      if (authRole === "student") {
        // Student must be accessing their own record.
        const service = getSupabaseServiceClient();
        const { data: profile, error } = await service
          .from("users")
          .select("unique_id")
          .eq("id", authUserId)
          .maybeSingle();
        if (error || !profile || profile.unique_id !== roll) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "You can only view your own student record." } },
            { status: 403 }
          );
        }
      } else {
        // Other roles like operator, parent are forbidden.
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to view student details." } },
          { status: 403 }
        );
      }
    }

    const student = await findStudentByRoll(roll);
    if (!student) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Student with roll ${roll} not found` } },
        { status: 404 }
      );
    }

    const status = await getStudentStatus(roll);
    const history = await getStudentHistory(roll, 20);

    return NextResponse.json({
      success: true,
      data: {
        student,
        campusStatus: status.status,
        lastScan: status.lastScan,
        history,
      },
    });
  } catch (error) {
    console.error("Error fetching student details:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load student data" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["admin", "sysadmin", "student"] }),
  { keyPrefix: "student_details", maxRequests: 100 }
);
