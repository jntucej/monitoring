/**
 * GET /api/persons/[uniqueId]/history
 * Self-service activity feed ANY account type (student, faculty, staff, admin, worker).
 * Also guardian access child's history. Privileged roles (admin/sysadmin/operator)
 * view anyone's history.
 * Response: success: true, data: { history: Scan[] }
 */
import NextRequest, NextResponse "next/server";
import getPersonHistory "@/lib/db";
import withAuthorization "@/middleware/authorization";
import withRateLimit "@/lib/rate-limit";
import getSupabaseServiceClient "@/lib/supabaseClient";

function getUniqueId(req: NextRequest): string {
  return decodeURIComponent(
    new URL(req.url).pathname.split("/").filter(Boolean)[3] || ""
  );
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication - user must be logged in
    const auth = (req as any).auth;
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const isAllowedRole = ["admin", "sysadmin", "operator"].includes(
      auth.role || ""
    );
    // Students can only view their own history
    const authRole = auth.role || "";
    if (authRole === "student") {
      const uniqueId = getUniqueId(req);
      if (auth.userId !== uniqueId) {
        return NextResponse.json(
          { success: false, error: "Forbidden: can only view own history" },
          { status: 403 }
        );
      }
    } else if (!isAllowedRole) {
      // Non-student, non-privileged roles denied
      return NextResponse.json(
        { success: false, error: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    const uniqueId = getUniqueId(req);
    const history = await getPersonHistory({ userId: uniqueId });
    return NextResponse.json({ success: true, data: { history } });
  } catch (err) {
    console.error("Persons history error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}