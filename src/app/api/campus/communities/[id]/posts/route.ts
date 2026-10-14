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
 * /api/campus/communities/[id]/posts
 *
 * GET  — posts for the community. Status filter via ?status=pending|approved|
 *        hidden|all. Visibility is enforced server-side:
 *          • approved posts: visible to everyone in the role set.
 *          • pending/hidden posts: only the author or a moderator/admin of
 *            the community (or a global admin/sysadmin) may read them.
 * POST — create a post. Membership is required. Posts by moderators/admins
 *        of this community (or global admin/sysadmin) start 'approved';
 *        everyone else starts 'pending'.
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

interface PostRow {
  id: string;
  title: string;
  body: string;
  status: string;
  author_id: string;
  reported_count: number;
  created_at: string;
  updated_at: string | null;
}

async function handleGet(req: NextRequest, context: { auth: AuthContext }): Promise<Response> {
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
  const moderator = canModerate(myRole, context.auth.role as Role);

  const statusParam = req.nextUrl.searchParams.get("status");
  const requested =
    statusParam && ["pending", "approved", "hidden"].includes(statusParam)
      ? statusParam
      : moderator
        ? "all"
        : "approved";

  const rows: PostRow[] = [];

  if (requested === "all") {
    // Moderators/admins see every status of this community.
    const { data: all, error: allErr } = await db
      .from("community_posts")
      .select("id, title, body, status, author_id, reported_count, created_at, updated_at")
      .eq("community_id", communityId)
      .in("status", ["pending", "approved", "hidden"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (allErr) {
      const e = err("DB_ERROR", allErr.message, 500);
      return NextResponse.json(e.body, { status: e.status });
    }
    rows.push(...((all ?? []) as PostRow[]));
  } else if (myRole !== null) {
    // Members: approved posts of the community plus their own posts of any
    // status (the widget shows a "pending moderation" hint on the latter).
    // Two small, index-friendly queries — no OR filter on the hot path.
    const { data: approved, error: appErr } = await db
      .from("community_posts")
      .select("id, title, body, status, author_id, reported_count, created_at, updated_at")
      .eq("community_id", communityId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(50);
    if (appErr) {
      const e = err("DB_ERROR", appErr.message, 500);
      return NextResponse.json(e.body, { status: e.status });
    }
    rows.push(...((approved ?? []) as PostRow[]));

    const { data: mine, error: mineErr } = await db
      .from("community_posts")
      .select("id, title, body, status, author_id, reported_count, created_at, updated_at")
      .eq("community_id", communityId)
      .eq("author_id", context.auth.userId)
      .in("status", ["pending", "hidden"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (mineErr) {
      const e = err("DB_ERROR", mineErr.message, 500);
      return NextResponse.json(e.body, { status: e.status });
    }
    rows.push(...((mine ?? []) as PostRow[]));
  } else {
    const { data: approved, error: appErr } = await db
      .from("community_posts")
      .select("id, title, body, status, author_id, reported_count, created_at, updated_at")
      .eq("community_id", communityId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(50);
    if (appErr) {
      const e = err("DB_ERROR", appErr.message, 500);
      return NextResponse.json(e.body, { status: e.status });
    }
    rows.push(...((approved ?? []) as PostRow[]));
  }

  // Second layer of defence: re-filter so pending/hidden rows can only ever
  // be read back by the author or a moderator/admin.
  const posts = rows.filter((p) => {
    if (p.status === "approved") return true;
    return moderator || p.author_id === context.auth.userId;
  });

  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));
  let authorNames = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data: users, error: userErr } = await db
      .from("users")
      .select("id, name")
      .in("id", authorIds);
    if (userErr) {
      const e = err("DB_ERROR", userErr.message, 500);
      return NextResponse.json(e.body, { status: e.status });
    }
    authorNames = new Map((users ?? []).map((u) => [String((u as { id: string }).id), String((u as { name?: string }).name ?? "")]));
  }

  return NextResponse.json({
    success: true,
    data: {
      isMember: myRole !== null,
      myRole,
      canModerate: moderator,
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        status: p.status,
        author: p.author_id === context.auth.userId ? "You" : authorNames.get(p.author_id) ?? "Unknown",
        reportedCount: p.reported_count,
        isOwn: p.author_id === context.auth.userId,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
    },
  });
}

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

  // Membership is required to post.
  const myRole = await membershipRoleIn(db, communityId, context.auth.userId);
  if (myRole === null && !canModerate(null, context.auth.role as Role)) {
    const e = err("FORBIDDEN", "Join this community before posting", 403);
    return NextResponse.json(e.body, { status: e.status });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    const e = err("BAD_REQUEST", "Invalid JSON body");
    return NextResponse.json(e.body, { status: e.status });
  }

  const title = String((body as Record<string, unknown>).title ?? "").trim();
  const text = String((body as Record<string, unknown>).body ?? "").trim();
  if (!title || title.length > 200) {
    const e = err("VALIDATION_ERROR", "title (1-200 chars) is required");
    return NextResponse.json(e.body, { status: e.status });
  }
  if (!text || text.length > 5000) {
    const e = err("VALIDATION_ERROR", "body (1-5000 chars) is required");
    return NextResponse.json(e.body, { status: e.status });
  }

  const moderatorOfThis = canModerate(myRole, context.auth.role as Role);
  const status: "pending" | "approved" = moderatorOfThis ? "approved" : "pending";

  const { data: inserted, error: insErr } = await db
    .from("community_posts")
    .insert({
      community_id: communityId,
      author_id: context.auth.userId,
      title,
      body: text,
      status,
    })
    .select("id, title, body, status, created_at")
    .single();
  if (insErr) {
    const e = err("DB_ERROR", insErr.message, 500);
    return NextResponse.json(e.body, { status: e.status });
  }

  void addAudit({
    action: "community_post_created",
    userId: context.auth.userId,
    role: context.auth.role,
    details: { postId: inserted.id, communityId, status },
  });

  return NextResponse.json({
    success: true,
    data: {
      post: {
        id: inserted.id,
        title: inserted.title,
        body: inserted.body,
        status: inserted.status,
        createdAt: inserted.created_at,
      },
      pending: status === "pending",
    },
  });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: [...READ_ROLES] }),
  { ...RATE_LIMITS.read, keyPrefix: "community_posts" }
);

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: [...READ_ROLES] }),
  { ...RATE_LIMITS.mutation, keyPrefix: "community_posts" }
);
