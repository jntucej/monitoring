import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { err } from "@/lib/api-response";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";
import { communityIdFromUrl, findCommunity, membershipRoleIn } from "../../shared";

/**
 * POST /api/campus/communities/[id]/leave
 *
 * Leave a community (drops the membership row). Members may always leave.
 * A moderator/admin of the community may NOT leave when they are the last
 * remaining moderator; an admin/sysadmin caller may override via
 * ?force=true.
 */

const READ_ROLES: readonly Role[] = [
  "operator",
  "admin",
  "sysadmin",
  "supervisor",
  "guardian",
  "parent",
  "hod",
  "student",
  "faculty",
  "staff",
  "worker",
  "visitor",
  "caretaker",
  "deputy_warden",
  "hostel_manager",
  "principal",
  "vice_principal",
  "oie",
  "exam_branch",
  "exam_superintendent",
  "mess_incharge",
];

async function handlePost(req: NextRequest, context: { auth: AuthContext }): Promise<Response> {
  const untrusted = requireTrustedHeaders(req);
  if (untrusted) return untrusted;

  const db = getSupabaseServiceClient();
  const url = new URL(req.url);
  const communityId = communityIdFromUrl(url);
  if (!communityId) {
    const e = err("BAD_REQUEST", "Invalid community id");
    return NextResponse.json(e.body, { status: e.status });
  }

  const community = await findCommunity(db, communityId);
  if (community == null) {
    const e = err("NOT_FOUND", "Community not found", 404);
    return NextResponse.json(e.body, { status: e.status });
  }

  const myRole = await membershipRoleIn(db, communityId, context.auth.userId);
  if (myRole === null) {
    const e = err("FORBIDDEN", "You are not a member of this community", 403);
    return NextResponse.json(e.body, { status: e.status });
  }

  const isGlobalAdmin = context.auth.role === "admin" || context.auth.role === "sysadmin";
  const force = url.searchParams.get("force") === "true";

  // Last-moderator guard: a moderator/admin cannot leave while they are the
  // only moderator. Only a global admin may override with ?force=true.
  if (myRole === "moderator" || myRole === "admin") {
    const { data: mods, error: modErr } = await db
      .from("community_memberships")
      .select("user_id")
      .eq("community_id", communityId)
      .in("role_in_community", ["moderator", "admin"]);
    if (modErr) {
      const e = err("DB_ERROR", modErr.message, 500);
      return NextResponse.json(e.body, { status: e.status });
    }
    const otherMods = (mods ?? []).filter((m) => m.user_id !== context.auth.userId).length;
    if (otherMods === 0 && !(force && isGlobalAdmin)) {
      const e = err(
        "FORBIDDEN",
        "You are the only moderator of this community. Assign another moderator before leaving.",
        403
      );
      return NextResponse.json(e.body, { status: e.status });
    }
  }

  const { error: delErr } = await db
    .from("community_memberships")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", context.auth.userId);
  if (delErr) {
    const e = err("DB_ERROR", delErr.message, 500);
    return NextResponse.json(e.body, { status: e.status });
  }

  return NextResponse.json({ success: true, data: { communityId, status: "left" } });
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: [...READ_ROLES] }),
  { ...RATE_LIMITS.mutation, keyPrefix: "communities" }
);
