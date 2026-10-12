import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/campus-extra/portfolio
 *
 * A record of verified contributions (volunteering, workshops, projects,
 * club responsibilities, authorized work assignments, recognized
 * contributions). Data reuses the engagement achievements/events/
 * completed-tasks endpoints. Export/share selected non-sensitive items only.
 * Not an official transcript.
 */

async function handleGet(
  _req: NextRequest,
  context: { auth: AuthContext }
) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;

  const items: Array<{
    id: string;
    title: string;
    type: string;
    date: string;
    details?: string;
    verified: boolean;
  }> = [];

  // 1. Achievements (verified contributions)
  const { data: achRows, error: achErr } = await supabase
    .from("user_achievements")
    .select("id, achievement_code, earned_at")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false })
    .limit(50);
  if (achErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: achErr.message } },
      { status: 500 }
    );
  }

  if (achRows && achRows.length > 0) {
    const codes = achRows.map((a: any) => a.achievement_code);
    const { data: defRows } = await supabase
      .from("achievement_definitions")
      .select("code, title, description, tier")
      .in("code", codes);
    const defMap = new Map((defRows || []).map((d: any) => [d.code, d]));

    for (const a of achRows) {
      const def = defMap.get(a.achievement_code);
      items.push({
        id: `ach_${a.id}`,
        title: def?.title ?? a.achievement_code,
        type: "achievement",
        date: a.earned_at,
        details: def?.description,
        verified: true,
      });
    }
  }

  // 2. Event registrations (attended = verified participation)
  const { data: regRows, error: regErr } = await supabase
    .from("event_registrations")
    .select("id, event_id, status, registered_at")
    .eq("user_id", userId)
    .in("status", ["attended", "registered"])
    .order("registered_at", { ascending: false })
    .limit(50);
  if (regErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: regErr.message } },
      { status: 500 }
    );
  }

  if (regRows && regRows.length > 0) {
    const eventIds = regRows.map((r: any) => r.event_id);
    const { data: evRows } = await supabase
      .from("campus_events")
      .select("id, title, category, starts_at, location")
      .in("id", eventIds);
    const evMap = new Map((evRows || []).map((e: any) => [e.id, e]));

    for (const r of regRows) {
      const ev = evMap.get(r.event_id);
      if (!ev) continue;
      items.push({
        id: `evt_${r.id}`,
        title: ev.title,
        type: r.status === "attended" ? "event_attendance" : "event_registration",
        date: r.registered_at,
        details: ev.location || ev.category,
        verified: r.status === "attended",
      });
    }
  }

  // 3. Personal goals (completed = verified)
  const { data: goalRows, error: goalErr } = await supabase
    .from("personal_goals")
    .select("id, title, is_completed, completed_at, current_value, target_value")
    .eq("user_id", userId)
    .eq("is_completed", true)
    .order("completed_at", { ascending: false })
    .limit(20);
  if (goalErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: goalErr.message } },
      { status: 500 }
    );
  }

  for (const g of goalRows || []) {
    items.push({
      id: `goal_${g.id}`,
      title: g.title,
      type: "goal_completed",
      date: g.completed_at || g.id,
      details: `${g.current_value}/${g.target_value}`,
      verified: true,
    });
  }

  // 4. Completed permission requests (authorized work assignments)
  const { data: permRows, error: permErr } = await supabase
    .from("permission_requests")
    .select("id, workflow_type, status, created_at, updated_at")
    .eq("requester_user_id", userId)
    .in("status", ["RESOLVED", "APPROVED"])
    .order("updated_at", { ascending: false })
    .limit(20);
  if (permErr) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: permErr.message } },
      { status: 500 }
    );
  }

  const WF_LABELS: Record<string, string> = {
    student_outpass: "Outpass Approval",
    staff_leave: "Leave Approval",
    visitor_pass: "Visitor Pass",
    gate_access: "Gate Access Request",
  };

  for (const p of permRows || []) {
    items.push({
      id: `perm_${p.id}`,
      title: WF_LABELS[p.workflow_type] ?? p.workflow_type,
      type: "work_assignment",
      date: p.updated_at,
      verified: true,
    });
  }

  // Sort by date descending
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({
    success: true,
    data: {
      items: items.slice(0, 100),
    },
  });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "campus_extra_portfolio",
  maxRequests: 30,
});
