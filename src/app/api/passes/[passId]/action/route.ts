import { NextRequest, NextResponse } from "next/server";
import { findPass, approvePass, rejectPass } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/passes/[id]/action
 * Body: { action: "approve" | "reject", comment?: string }
 * Allowed roles: admin, sysadmin, warden, supervisor.
 * Warden actions are scoped to their assigned hostel block.
 */

function getPassId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // /api/passes/:passId/action -> second-to-last segment is the pass id
  return segments[segments.length - 2];
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const passId = getPassId(req);
    if (!passId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PATH", message: "Pass id missing from URL." } },
        { status: 400 }
      );
    }

    const authUserId = auth.userId;
    const authRole = auth.role;
    if (!authUserId) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Could not identify approver." } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const action: string = body?.action;
    const comment: string = String(body?.comment ?? "");

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ACTION", message: "Action must be 'approve' or 'reject'." } },
        { status: 400 }
      );
    }

    if (action === "reject" && !comment.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_COMMENT", message: "Comment is required for rejection." } },
        { status: 400 }
      );
    }

    const pass = await findPass(passId);
    if (!pass) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Gate pass not found" } },
        { status: 404 }
      );
    }

    // Warden/supervisor hostel block scoping check
    if (authRole === "principal" || authRole === "supervisor") {
      const service = getSupabaseServiceClient();
      const { data: approverProfile } = await service
        .from("users")
        .select("assigned_hostel, department_id")
        .eq("id", authUserId)
        .maybeSingle();

      const wardenHostel = approverProfile?.assigned_hostel;
      if (wardenHostel && pass.roll) {
        const { data: studentDetail } = await service
          .from("student_details")
          .select("hostel_block")
          .eq("roll", pass.roll)
          .maybeSingle();

        if (studentDetail?.hostel_block && studentDetail.hostel_block !== wardenHostel) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "FORBIDDEN_HOSTEL_SCOPE",
                message: `${authRole} is assigned to hostel block ${wardenHostel}, but pass belongs to a student in ${studentDetail.hostel_block}.`,
              },
            },
            { status: 403 }
          );
        }
      }
    }

    const result =
      action === "approve"
        ? await approvePass(passId, authRole, comment, authUserId)
        : await rejectPass(passId, authRole, comment, authUserId);

    if (!result) {
      return NextResponse.json(
        { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update pass status." } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...pass,
        adminStatus: action === "approve" ? "APPROVED" : "REJECTED",
        finalStatus: action === "approve" ? "APPROVED" : "REJECTED",
        adminComment: comment,
        adminApproverId: authUserId,
      },
    });
  } catch (error) {
    console.error("Error executing pass action:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update pass" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, {
    requiredRole: ["admin", "sysadmin", "operator", "warden", "supervisor", "principal"],
  }),
  { keyPrefix: "passes_action", maxRequests: 50 }
);
