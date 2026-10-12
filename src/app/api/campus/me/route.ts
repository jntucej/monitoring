import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/campus/me
 *
 * The authenticated user's personalized campus snapshot:
 * identity, pending permission requests, upcoming events, completed
 * tasks this month, latest visible announcement, latest achievement.
 * Everything is read from real tables; no synthetic data.
 */
async function handleGet(_req: NextRequest, context: { auth: AuthContext }) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;

  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("id, name, email, role, unique_id")
    .eq("id", userId)
    .maybeSingle();
  if (userErr || !user) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 });
  }

  // Pending permission requests: the user's own requests that are still PENDING.
  const { data: pendingRows, count: pendingCount, error: pendingErr } = await supabase
    .from("permission_requests")
    .select("id", { count: "exact", head: true })
    .eq("student_user_id", userId)
    .eq("status", "PENDING");
  if (pendingErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: pendingErr.message } }, { status: 500 });
  }
  const pendingRequests = pendingCount ?? (pendingRows?.length ?? 0);

  // Upcoming public/published events.
  const nowIso = new Date().toISOString();
  const { data: upcoming, error: eventsErr } = await supabase
    .from("campus_events")
    .select("id")
    .eq("is_published", true)
    .eq("is_public", true)
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(200);
  if (eventsErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: eventsErr.message } }, { status: 500 });
  }
  const upcomingEvents = upcoming?.length ?? 0;

  // Completed personal goals this calendar month.
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { data: goals, error: goalsErr } = await supabase
    .from("personal_goals")
    .select("id")
    .eq("user_id", userId)
    .eq("is_completed", true)
    .gte("completed_at", monthStart.toISOString());
  if (goalsErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: goalsErr.message } }, { status: 500 });
  }
  const tasksCompletedThisMonth = goals?.length ?? 0;

  // Latest visible announcement (published, unexpired, audience-matched).
  let latestAnnouncement: {
    id: string;
    title: string;
    message: string;
    priority: string;
    updatedAt: string | null;
  } | null = null;
  const { data: anns, error: annErr } = await supabase
    .from("announcements")
    .select("id, title, message, priority, updated_at, audience, expires_at")
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (annErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: annErr.message } }, { status: 500 });
  }
  if (anns && anns.length > 0) {
    const a = anns[0];
    const audienceOk = a.audience === "all" || a.audience === context.auth.role;
    const notExpired = !a.expires_at || new Date(a.expires_at) > new Date();
    if (audienceOk && notExpired) {
      latestAnnouncement = {
        id: a.id,
        title: a.title,
        message: a.message,
        priority: a.priority ?? "medium",
        updatedAt: a.updated_at,
      };
    }
  }

  // Latest earned achievement.
  const { data: ach, error: achErr } = await supabase
    .from("user_achievements")
    .select("achievement_code, earned_at")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false })
    .limit(1);
  if (achErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: achErr.message } }, { status: 500 });
  }
  let latestAchievement: {
    code: string;
    title: string;
    icon: string | null;
    tier: string;
    earnedAt: string;
  } | null = null;
  if (ach && ach.length > 0) {
    const { data: def, error: defErr } = await supabase
      .from("achievement_definitions")
      .select("code, title, icon, tier")
      .eq("code", ach[0].achievement_code)
      .maybeSingle();
    if (defErr) {
      return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: defErr.message } }, { status: 500 });
    }
    if (def) {
      latestAchievement = {
        code: def.code,
        title: def.title,
        icon: def.icon,
        tier: def.tier,
        earnedAt: ach[0].earned_at,
      };
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        uniqueId: user.unique_id ?? null,
        email: user.email,
      },
      pendingRequests,
      upcomingEvents,
      tasksCompletedThisMonth,
      latestAnnouncement,
      latestAchievement,
    },
  });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "campus_me",
  maxRequests: 60,
});
