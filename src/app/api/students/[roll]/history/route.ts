import { NextRequest, NextResponse } from "next/server";
import { getStudentHistory } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { supabase } from "@/lib/supabaseClient";

/**
 * Extract the [roll] dynamic segment from the request URL.
 */
function getRoll(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // URL pattern: /api/students/:roll/history
  // segments would be [... , 'students', ':roll', 'history']
  // index of :roll is -2
  return decodeURIComponent(segments[segments.length - 2]);
}

async function handleGet(req: NextRequest) {
  try {
    const roll = getRoll(req);
    const authUserId = req.headers.get("x-user-id");
    const authRole = req.headers.get("x-user-role");

    // Authorization Check
    const isAllowedRole = ["supervisor", "admin", "sysadmin"].includes(authRole || "");

    if (!isAllowedRole) {
      if (authRole === "student") {
        // Student must be accessing their own record.
        const { data: profile, error } = await supabase
          .from("users")
          .select("unique_id")
          .eq("id", authUserId)
          .single();
        if (error || !profile || profile.unique_id !== roll) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "You can only view your own student record." } },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions." } },
          { status: 403 }
        );
      }
    }

    const history = await getStudentHistory(roll, 50); // Increased limit as it's a dedicated history endpoint

    return NextResponse.json({
      success: true,
      data: {
        history,
      },
    });
  } catch (error) {
    console.error("Error fetching student history:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load student history" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: ["supervisor", "admin", "sysadmin", "student"] }),
  { keyPrefix: "student_history", maxRequests: 50 }
);
