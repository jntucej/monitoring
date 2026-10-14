import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { err } from "@/lib/api-response";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";
import { communityIdFromUrl, findCommunity } from "../../shared";

/**
 * POST /api/campus/communities/[id]/join
 *
 * Join a community as a plain 'member'. Idempotent — re-joining an
 * existing membership returns success with "already_joined" and does not
 * change the caller's role_in_community.
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
  const communityId = communityIdFromUrl(new URL(req.url));
  if (!communityId) {
    const e = err("BAD_REQUEST", "Invalid community id");
    return NextResponse.json(e.body, { status: e.status });
  }

  const community = await findCommunity(db, communityId);
  if (community == null) {
    const e = err("NOT_FOUND", "Community not found", 404);
    return NextResponse.json(e.body, { status: e.status });
  }

  const { data: existing, error: exErr } = await db
    .from("community_memberships")
    .select("role_in_community")
    .eq("community_id", communityId)
    .eq("user_id", context.auth.userId)
    .maybeSingle();
  if (exErr) {
    const e = err("DB_ERROR", exErr.message, 500);
    return NextResponse.json(e.body, { status: e.status });
  }

  if (existing) {
    return NextResponse.json({
      success: true,
      data: { communityId, status: "already_joined", roleInCommunity: existing.role_in_community },
    });
  }

  const { error: insErr } = await db
    .from("community_memberships")
    .insert({ community_id: communityId, user_id: context.auth.userId, role_in_community: "member" });
  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json({
        success: true,
        data: { communityId, status: "already_joined", roleInCommunity: "member" },
      });
    }
    const e = err("DB_ERROR", insErr.message, 500);
    return NextResponse.json(e.body, { status: e.status });
  }

  return NextResponse.json({
    success: true,
    data: { communityId, status: "joined", roleInCommunity: "member" },
  });
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: [...READ_ROLES] }),
  { ...RATE_LIMITS.mutation, keyPrefix: "communities" }
);
