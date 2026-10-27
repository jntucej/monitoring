import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { err } from "@/lib/api-response";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";
import { communityIdFromUrl, findCommunity, membershipRoleIn, canModerate } from "../../shared";

/**
 * POST /api/campus/communities/[id]/moderate
 *
 * Body: { postId, action: "approve" | "hide" | "unhide" }
 *
 * Only moderators/admins of the community (or a global admin/sysadmin)
 * may act. Sets community_posts.status and audits the transition.
 */

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

  const myRole = await membershipRoleIn(db, communityId, context.auth.userId);
  if (!canModerate(myRole, context.auth.role as Role)) {
    const e = err("FORBIDDEN", "Only moderators or administrators can moderate this community", 403);
    return NextResponse.json(e.body, { status: e.status });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    const e = err("BAD_REQUEST", "Invalid JSON body");
    return NextResponse.json(e.body, { status: e.status });
  }

  const rec = body as Record<string, unknown>;
  const postId = String(rec.postId ?? "").trim();
  const action = String(rec.action ?? "");
  if (!postId || !["approve", "hide", "unhide"].includes(action)) {
    const e = err("VALIDATION_ERROR", "postId and action (approve|hide|unhide) are required");
    return NextResponse.json(e.body, { status: e.status });
  }

  const { data: post, error: postErr } = await db
    .from("community_posts")
    .select("id, status, author_id")
    .eq("id", postId)
    .eq("community_id", communityId)
    .maybeSingle();
  if (postErr) {
    const e = err("DB_ERROR", postErr.message, 500);
    return NextResponse.json(e.body, { status: e.status });
  }
  if (!post) {
    const e = err("NOT_FOUND", "Post not found in this community", 404);
    return NextResponse.json(e.body, { status: e.status });
  }

  const newStatus =
    action === "approve" ? "approved" : action === "hide" ? "hidden" : "approved";

  const { error: upErr } = await db
    .from("community_posts")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", postId);
  if (upErr) {
    const e = err("DB_ERROR", upErr.message, 500);
    return NextResponse.json(e.body, { status: e.status });
  }

  await addAudit({
    action: "community_post_moderated",
    userId: context.auth.userId,
    role: context.auth.role,
    details: {
      postId,
      communityId,
      from: post.status,
      to: newStatus,
      moderatorRole: myRole,
    },
  });

  return NextResponse.json({
    success: true,
    data: { postId, status: newStatus },
  });
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["admin", "sysadmin", "faculty", "student"] }),
  { ...RATE_LIMITS.mutation, keyPrefix: "community_moderate" }
);
