import { NextRequest, NextResponse } from "next/server";
import { getPersonHistory } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";

/**
 * GET /api/persons/:uniqueId/history — per-person gate movement history.
 *
 * Self-service activity feed for ANY account type (student, faculty, staff,
 * worker) plus guardian access to their child's history. Privileged roles
 * (admin/sysadmin/operator) may view anyone's history.
 *
 * Response: { success: true, data: { history: Scan[] } }
 */
function getUniqueId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // URL pattern: /api/persons/:uniqueId/history
  return decodeURIComponent(segments[segments.length - 2]);
}

async function handleGet(req: NextRequest) {
  try {
    const uniqueId = getUniqueId(req);
    const authUserId = req.headers.get("x-user-id");
    const authRole = req.headers.get("x-user-role");

    const limitParam = parseInt(req.nextUrl.searchParams.get("limit") || "20", 10);
    const limit = Math.min(Math.max(Number.isNaN(limitParam) ? 20 : limitParam, 1), 200);

    const service = getSupabaseServiceClient();
    const { data: target } = await service
      .from("users")
      .select("id")
      .eq("unique_id", uniqueId)
      .maybeSingle();

    if (!target) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Person with ID ${uniqueId} not found` } },
        { status: 404 }
      );
    }

    const isPrivileged = ["admin", "sysadmin", "operator"].includes(authRole || "");
    let allowed = isPrivileged || target.id === authUserId;

    // Guardians may view their child's history (role can be "parent" or "guardian").
    if (!allowed && ["parent", "guardian"].includes(authRole || "")) {
      const { data: child } = await service
        .from("student_details")
        .select("user_id")
        .eq("guardian_id", authUserId || "")
        .eq("user_id", target.id)
        .maybeSingle();
      allowed = Boolean(child);
    }

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You can only view your own activity history." } },
        { status: 403 }
      );
    }

    const history = await getPersonHistory(uniqueId, limit);

    return NextResponse.json({ success: true, data: { history } });
  } catch (error) {
    console.error("Error fetching person history:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load person history" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, {
    requiredRole: ["admin", "sysadmin", "operator", "student", "parent", "guardian", "faculty", "staff", "worker"],
  }),
  { keyPrefix: "person_history", maxRequests: 50 }
);