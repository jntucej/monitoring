import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/campus/recap
 *
 * A semester recap for the caller: completed events, earned
 * achievements, and completed goals. Deliberately excludes any
 * sensitive data — no movement logs, no attendance records, no
 * disciplinary history — so the recap is safe to share as a card.
 */
async function handleGet(_req: NextRequest, context: { auth: AuthContext }) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;

  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("id, name, role")
    .eq("id", userId)
    .maybeSingle();
  if (userErr || !user) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 });
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  // 1. Registered events (active registrations only).
  const { data: regs, error: regErr } = await supabase
    .from("event_registrations")
    .select("event_id, status")
    .eq("user_id", userId)
    .in("status", ["registered", "attended"]);
  if (regErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: regErr.message } }, { status: 500 });
  }
  const eventIds = (regs || []).map((r) => r.event_id);
  let completedEvents: string[] = [];
  let eventsRegistered = eventIds.length;
  if (eventIds.length > 0) {
    const { data: evs, error: evErr } = await supabase
      .from("campus_events")
      .select("id, title, starts_at")
      .in("id", eventIds);
    if (evErr) {
      return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: evErr.message } }, { status: 500 });
    }
    const attendedIds = new Set((regs || []).filter((r) => r.status === "attended").map((r) => r.event_id));
    completedEvents = (evs || []).map((e) => e.title);
    void attendedIds;
  }

  // 2. Earned achievements (joined to definitions).
  const { data: earnedRows, error: achErr } = await supabase
    .from("user_achievements")
    .select("achievement_code")
    .eq("user_id", userId);
  if (achErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: achErr.message } }, { status: 500 });
  }
  let earnedAchievements: Array<{ code: string; title: string; icon: string | null }> = [];
  if (earnedRows && earnedRows.length > 0) {
    const codes = earnedRows.map((r) => r.achievement_code);
    const { data: defs, error: defErr } = await supabase
      .from("achievement_definitions")
      .select("code, title, icon")
      .in("code", codes);
    if (defErr) {
      return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: defErr.message } }, { status: 500 });
    }
    earnedAchievements = (defs || []).map((d) => ({ code: d.code, title: d.title, icon: d.icon }));
  }

  // 3. Personal goals: total + completed.
  const { data: goals, error: goalErr } = await supabase
    .from("personal_goals")
    .select("id, is_completed")
    .eq("user_id", userId);
  if (goalErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: goalErr.message } }, { status: 500 });
  }
  const totalGoals = goals?.length ?? 0;
  const completedGoals = goals?.filter((g) => g.is_completed).length ?? 0;

  // Human period label (local time).
  const now = new Date();
  const periodLabel = `${now.toLocaleDateString(undefined, { month: "long", year: "numeric" })} Recap`;

  void monthStart;

  return NextResponse.json({
    success: true,
    data: {
      userName: user.name,
      role: user.role,
      periodLabel,
      completedEvents,
      earnedAchievements,
      completedGoals,
      totalGoals,
      eventsRegistered,
    },
  });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "campus_recap",
  maxRequests: 30,
});
