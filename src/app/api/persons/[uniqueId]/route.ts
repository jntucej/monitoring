import { NextRequest, NextResponse } from "next/server";
import { findPersonByUniqueId, getPersonHistory, getPersonStatus } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { supabase } from "@/lib/supabaseClient";

function getUniqueId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1]);
}

async function handleGet(req: NextRequest) {
  try {
    const uniqueId = getUniqueId(req);
    const authUserId = req.headers.get("x-user-id");
    const authRole = req.headers.get("x-user-role");

    const isAllowedRole = ["supervisor", "admin", "sysadmin", "faculty", "staff", "operator"].includes(authRole || "");

    if (!isAllowedRole) {
      if (authRole === "student" || authRole === "parent" || authRole === "guardian" || authRole === "worker") {
        // Query users and student_details to check owner or guardian link
        const { data: userCheck } = await supabase
          .from("users")
          .select("id, unique_id, student_details!student_details_user_id_fkey(guardian_id)")
          .eq("unique_id", uniqueId)
          .maybeSingle();

        const isSelf = userCheck?.id === authUserId || userCheck?.unique_id === uniqueId;
        const isChildOfGuardian = userCheck?.student_details && (userCheck.student_details as any).guardian_id === authUserId;

        if (!isSelf && !isChildOfGuardian) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "You can only view your own record or your child's record." } },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions to view person details." } },
          { status: 403 }
        );
      }
    }

    const person = await findPersonByUniqueId(uniqueId);
    if (!person) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Person with ID ${uniqueId} not found` } },
        { status: 404 }
      );
    }

    const status = await getPersonStatus(uniqueId);
    const history = await getPersonHistory(uniqueId, 20);

    return NextResponse.json({
      success: true,
      data: {
        person,
        campusStatus: status.status,
        lastScan: status.lastScan,
        history,
      },
    });
  } catch (error) {
    console.error("Error fetching person details:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load person data" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["supervisor", "admin", "sysadmin", "student", "parent", "faculty", "staff", "operator", "worker"] }),
  { keyPrefix: "person_details", maxRequests: 100 }
);
