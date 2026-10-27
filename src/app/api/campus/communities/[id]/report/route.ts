import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { err } from "@/lib/api-response";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";
import { communityIdFromUrl, findCommunity, membershipRoleIn, canModerate } from "../../shared";

/**
 * POST /api/campus/communities/[id]/report
 *
 * Body: { postId, reason }
 *
 * Any member of the community may report a post. Upserts into
 * community_reports (one report per reporter per post — the UNIQUE
 * constraint makes re-reports idempotent) and increments
 * community_posts.reported_count exactly once per reporter.
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

  // Membership is required to report (or the caller moderates the community).
  const myRole = await membershipRoleIn(db, communityId, context.auth.userId);
  if (myRole === null && !canModerate(null, context.auth.role as Role)) {
    const e = err("FORBIDDEN", "Join this community before reporting", 403);
    return NextResponse.json(e.body, { status: e.status });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    const e = err("BAD_REQUEST", "Invalid JSON body");
    return NextResponse.json(e.body, { status: e.status });
  }

  const rec = body as Record<string, unknown>;
  const postId = String(rec.postId ?? "").trim();
  const reason = String(rec.reason ?? "").trim().slice(0, 500);
  if (!postId || !reason) {
    const e = err("VALIDATION_ERROR", "postId and reason are required");
    return NextResponse.json(e.body, { status: e.status });
  }

  // The post must exist and belong to this community.
  const { data: post, error: postErr } = await db
    .from("community_posts")
    .select("id")
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

  // One report per reporter per post: duplicate → idempotent success.
  const { data: existing, error: exErr } = await db
    .from("community_reports")
    .select("id")
    .eq("post_id", postId)
    .eq("reporter_id", context.auth.userId)
    .maybeSingle();
  if (exErr) {
    const e = err("DB_ERROR", exErr.message, 500);
    return NextResponse.json(e.body, { status: e.status });
  }
  if (existing) {
    return NextResponse.json({
      success: true,
      data: { postId, alreadyReported: true },
    });
  }

  const { error: insErr } = await db
    .from("community_reports")
    .insert({ post_id: postId, reporter_id: context.auth.userId, reason });
  if (insErr) {
    // Lost the unique-constraint race — treat as an idempotent duplicate.
    if (insErr.code === "23505") {
      return NextResponse.json({
        success: true,
        data: { postId, alreadyReported: true },
      });
    }
    const e = err("DB_ERROR", insErr.message, 500);
    return NextResponse.json(e.body, { status: e.status });
  }

  // Increment the denormalised counter exactly once (new report only).
  const { data: current, error: cntErr } = await db
    .from("community_posts")
    .select("reported_count")
    .eq("id", postId)
    .single();
  if (!cntErr && current) {
    const next = Number((current as { reported_count?: number }).reported_count ?? 0) + 1;
    await db
      .from("community_posts")
      .update({ reported_count: next, updated_at: new Date().toISOString() })
      .eq("id", postId);
  }

  return NextResponse.json({
    success: true,
    data: { postId, alreadyReported: false },
  });
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: [...READ_ROLES] }),
  { ...RATE_LIMITS.mutation, keyPrefix: "community_report" }
);
