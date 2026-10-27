import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { err } from "@/lib/api-response";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";
import {
  communityIdFromUrl,
  findCommunity,
  communityMembershipState,
  canModerate,
} from "../shared";

/**
 * GET /api/campus/communities/[id]
 *
 * One community: its metadata, membership count, the caller's own
 * membership state, and the latest approved posts (limit 20) so the
 * widget can render immediately without a second round-trip.
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

async function handleGet(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
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

  const { memberCount, myRole } = await communityMembershipState(db, communityId, auth.userId);
  const moderator = canModerate(myRole, auth.role as Role);

  // Latest approved posts only — pending/hidden stay out of the public view.
  const { data: posts, error: postErr } = await db
    .from("community_posts")
    .select("id, title, body, status, author_id, created_at, updated_at")
    .eq("community_id", communityId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(20);
  if (postErr) {
    const e = err("DB_ERROR", postErr.message, 500);
    return NextResponse.json(e.body, { status: e.status });
  }

  const authorIds = Array.from(
    new Set(((posts ?? []) as Array<{ author_id?: string }>).map((p) => p.author_id).filter((v): v is string => !!v))
  );
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
      community: {
        id: community.id,
        name: community.name,
        description: community.description,
        icon: community.icon,
        isModerated: community.is_moderated,
        createdAt: community.created_at,
      },
      memberCount,
      isMember: myRole !== null,
      myRole,
      canModerate: moderator,
      posts: (posts ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        author: authorNames.get(String(p.author_id)) ?? "Unknown",
        createdAt: p.created_at,
      })),
    },
  });
}

export const GET = withRateLimit(
  withAuthorization(handleGet, { requiredRole: [...READ_ROLES] }),
  { ...RATE_LIMITS.read, keyPrefix: "communities" }
);
