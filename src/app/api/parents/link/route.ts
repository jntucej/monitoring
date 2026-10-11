import { NextRequest, NextResponse } from "next/server";
import { linkParentToStudent } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/parents/link
 * Body: { studentId: string, parentUserId: string | null }
 * Links (or unlinks when parentUserId is null) a parent to a student.
 */
async function handlePost(req: NextRequest) {
  const actorId = req.headers.get("x-user-id") || "system";
  try {
    const body = await req.json().catch(() => ({}));
    const { studentId, parentUserId } = body;

    if (!studentId || typeof studentId !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_STUDENT_ID", message: "studentId is required" } },
        { status: 400 }
      );
    }

    // Validate that the parent user exists when linking
    if (parentUserId && typeof parentUserId === "string") {
      const { getSupabaseServiceClient } = await import("@/lib/dbClient");
      const service = getSupabaseServiceClient();
      const { data: parent } = await service
        .from("users")
        .select("id, name")
        .eq("id", parentUserId)
        .maybeSingle();
      if (!parent) {
        return NextResponse.json(
          { success: false, error: { code: "PARENT_NOT_FOUND", message: "Parent user not found" } },
          { status: 404 }
        );
      }
    }

    const result = await linkParentToStudent(studentId, parentUserId || null, actorId);

    return NextResponse.json({
      success: true,
      data: { studentId, guardianId: result.guardianId, ok: result.ok },
    });
  } catch (error: any) {
    console.error("Error linking parent to student:", error);
    return NextResponse.json(
      { success: false, error: { code: "LINK_FAILED", message: error?.message || "Failed to update guardian link" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin"] }),
  { keyPrefix: "parents_link", maxRequests: 60 }
);
