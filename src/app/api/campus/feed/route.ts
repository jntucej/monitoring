import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/campus/feed?filter=all|announcements|events|followed
 *
 * Merged campus feed: official announcements + campus events, each with
 * publisher + last-updated metadata. "Official" (verified-notice) items are
 * those created by an admin/sysadmin user. The "followed" filter returns
 * only announcements the user explicitly followed.
 */
const OFFICIAL_ROLES = new Set(["admin", "sysadmin"]);

interface AnnRow {
  id: string;
  title: string;
  message: string;
  priority: string | null;
  audience: string | null;
  created_by: string | null;
  updated_at: string | null;
  expires_at: string | null;
}

interface EventRow {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  published_by: string;
  published_by_user_id: string | null;
  updated_at: string | null;
}

interface CreatorInfo {
  name: string;
  role: string;
}

async function handleGet(req: NextRequest, context: { auth: AuthContext }) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;
  const role = context.auth.role;
  const filter = (req.nextUrl.searchParams.get("filter") || "all") as
    | "all"
    | "announcements"
    | "events"
    | "followed";

  const nowIso = new Date().toISOString();
  const wantAnnouncements = filter === "all" || filter === "announcements" || filter === "followed";
  const wantEvents = filter === "all" || filter === "events";

  let announcementItems: Array<{
    id: string;
    title: string;
    message: string;
    priority: string;
    publisher: string;
    isOfficial: boolean;
    lastUpdated: string | null;
    followed: boolean;
  }> = [];
  let eventItems: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    location: string | null;
    startsAt: string;
    endsAt: string | null;
    publisher: string;
    isOfficial: boolean;
    lastUpdated: string | null;
  }> = [];
  let followedCount = 0;

  if (wantAnnouncements) {
    const { data: annRows, error: annErr } = await supabase
      .from("announcements")
      .select("id, title, message, priority, audience, created_by, updated_at, expires_at")
      .eq("is_published", true)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (annErr) {
      return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: annErr.message } }, { status: 500 });
    }

    // Resolver map for announcement creators (admin/sysadmin ⇒ official).
    const creatorIds = Array.from(
      new Set((annRows || []).map((a) => a.created_by).filter((v): v is string => !!v))
    );
    let creators = new Map<string, CreatorInfo>();
    if (creatorIds.length > 0) {
      const { data: users, error: uErr } = await supabase
        .from("users")
        .select("id, name, role")
        .in("id", creatorIds);
      if (uErr) {
        return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: uErr.message } }, { status: 500 });
      }
      creators = new Map((users || []).map((u) => [u.id, { name: u.name, role: u.role }]));
    }

    let follows: Array<{ announcement_id: string }> = [];
    let dismissedIds = new Set<string>();
    if (filter === "followed") {
      const { data: fRows, error: fErr } = await supabase
        .from("announcement_follows")
        .select("announcement_id")
        .eq("user_id", userId);
      if (fErr) {
        return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: fErr.message } }, { status: 500 });
      }
      follows = fRows || [];
    } else {
      const { data: dRows } = await supabase
        .from("user_announcement_dismissals")
        .select("announcement_id")
        .eq("user_id", userId);
      dismissedIds = new Set((dRows || []).map((d) => d.announcement_id));
    }
    const followedIds = new Set(follows.map((f) => f.announcement_id));
    followedCount = followedIds.size;

    const now = new Date();
    announcementItems = (annRows || [])
      .filter((a: AnnRow) => {
        if (filter === "followed" && !followedIds.has(a.id)) return false;
        if (filter !== "followed" && dismissedIds.has(a.id)) return false;
        if (a.expires_at && new Date(a.expires_at) < now) return false;
        const audienceOk = !a.audience || a.audience === "all" || a.audience === role;
        return audienceOk;
      })
      .map((a: AnnRow) => {
        const creator = a.created_by ? creators.get(a.created_by) : undefined;
        return {
          id: a.id,
          title: a.title,
          message: a.message,
          priority: a.priority ?? "medium",
          publisher: creator?.name ?? "Campus",
          isOfficial: !!a.created_by && OFFICIAL_ROLES.has(creator?.role ?? ""),
          lastUpdated: a.updated_at,
          followed: followedIds.has(a.id),
        };
      });
  }

  if (wantEvents) {
    const { data: evRows, error: evErr } = await supabase
      .from("campus_events")
      .select("id, title, description, category, location, starts_at, ends_at, published_by, published_by_user_id, updated_at")
      .eq("is_published", true)
      .eq("is_public", true)
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(50);
    if (evErr) {
      return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: evErr.message } }, { status: 500 });
    }

    const publisherIds = Array.from(
      new Set((evRows || []).map((e) => e.published_by_user_id).filter((v): v is string => !!v))
    );
    let eventPublishers = new Map<string, CreatorInfo>();
    if (publisherIds.length > 0) {
      const { data: users, error: uErr } = await supabase
        .from("users")
        .select("id, name, role")
        .in("id", publisherIds);
      if (uErr) {
        return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: uErr.message } }, { status: 500 });
      }
      eventPublishers = new Map((users || []).map((u) => [u.id, { name: u.name, role: u.role }]));
    }

    eventItems = (evRows || []).map((e: EventRow) => {
      const publisher = e.published_by_user_id
        ? eventPublishers.get(e.published_by_user_id)
        : undefined;
      return {
        id: e.id,
        title: e.title,
        description: e.description,
        category: e.category,
        location: e.location,
        startsAt: e.starts_at,
        endsAt: e.ends_at,
        publisher: publisher?.name ?? e.published_by,
        isOfficial: !!e.published_by_user_id && OFFICIAL_ROLES.has(publisher?.role ?? ""),
        lastUpdated: e.updated_at,
      };
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      announcements: announcementItems,
      events: eventItems,
      followedCount,
    },
  });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "campus_feed",
  maxRequests: 60,
});
