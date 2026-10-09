import { NextRequest, NextResponse } from "next/server";
import { getPersonHistory, getParentChildren } from "@/lib/db";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

function getUniqueId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] || "");
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const uniqueId = getUniqueId(req);
    const authRole = auth.role;
    const isPrivileged = ["admin", "sysadmin", "operator"].includes(authRole);

    if (!isPrivileged) {
      const service = getSupabaseServiceClient();
      const { data: profile } = await service
        .from("users")
        .select("unique_id")
        .eq("id", auth.userId)
        .maybeSingle();

      const isOwn = profile?.unique_id && profile.unique_id === uniqueId;
      let isGuardianOfStudent = false;

      if (!isOwn && (authRole === "parent" || authRole === "guardian")) {
        const children = await getParentChildren(auth.userId);
        isGuardianOfStudent = children.some(c => c.roll === uniqueId || c.id === uniqueId);
      }

      if (!isOwn && !isGuardianOfStudent) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "You can only view your own history or your child's history." } },
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
    requiredRole: ["admin", "sysadmin", "operator", "student", "faculty", "staff", "worker", "parent", "warden", "supervisor"],
  }),
  { keyPrefix: "person_history", maxRequests: 60 }
);
