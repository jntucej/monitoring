/**
 * GET /api/persons/[uniqueId]/history
 * Self-service activity feed ANY account type (student, faculty, staff, admin, worker).
 * Also guardian access child's history. Privileged roles (admin/sysadmin/operator)
 * view anyone's history.
 * Response: success: true, data: { history: Scan[] }
 */
import { NextRequest, NextResponse } from "next/server";
import { getPersonHistory } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

function getUniqueId(req: NextRequest): string {
  return decodeURIComponent(
    new URL(req.url).pathname.split("/").filter(Boolean)[3] || ""
  );
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const uniqueId = getUniqueId(req);
    const authRole = auth.role;
    const isPrivileged = ["admin", "sysadmin", "operator"].includes(authRole);

    // Non-privileged callers may only view their own history.
    if (!isPrivileged) {
      const service = getSupabaseServiceClient();
      const { data: profile } = await service
        .from("users")
        .select("unique_id")
        .eq("id", auth.userId)
        .maybeSingle();

      if (!profile?.unique_id || profile.unique_id !== uniqueId) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "You can only view your own history." } },
          { status: 403 }
        );
      }
    }

    const history = await getPersonHistory(uniqueId);
    return NextResponse.json({ success: true, data: { history } });
  } catch (err) {
    console.error("Persons history error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(handleGet, {
    requiredRole: ["admin", "sysadmin", "operator", "student", "faculty", "staff", "worker", "parent", "warden"],
  }),
  { keyPrefix: "person_history", maxRequests: 60 }
);