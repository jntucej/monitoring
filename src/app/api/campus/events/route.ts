import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/campus/events
 *
 * Upcoming published public campus events with live registration counts
 * and the caller's own registration state (idempotent read).
 */
async function handleGet(_req: NextRequest, context: { auth: AuthContext }) {
  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;
  const nowIso = new Date().toISOString();

  const { data: events, error: evErr } = await supabase
    .from("campus_events")
    .select("id, title, description, category, location, starts_at, ends_at, capacity, is_published, is_public")
    .eq("is_published", true)
    .eq("is_public", true)
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(200);
  if (evErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: evErr.message } }, { status: 500 });
  }

  const eventIds = (events || []).map((e) => e.id);
  const counts = new Map<string, number>();
  const myRegistrations = new Map<string, string>();

  if (eventIds.length > 0) {
    const { data: regs, error: regErr } = await supabase
      .from("event_registrations")
      .select("event_id, user_id, status")
      .in("event_id", eventIds);
    if (regErr) {
      return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: regErr.message } }, { status: 500 });
    }
    for (const r of regs || []) {
      if (r.status === "cancelled") continue;
      counts.set(r.event_id, (counts.get(r.event_id) ?? 0) + 1);
      if (r.user_id === userId) {
        myRegistrations.set(r.event_id, r.status);
      }
    }
  }

  const eventList = (events || []).map((e) => {
    const active = myRegistrations.get(e.id);
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      location: e.location,
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      capacity: e.capacity,
      registrations: counts.get(e.id) ?? 0,
      isRegistered: active === "registered" || active === "attended",
      registrationStatus: active ?? null,
    };
  });

  return NextResponse.json({
    success: true,
    data: { events: eventList },
  });
}

export const GET = withRateLimit(withAuthorization(handleGet), {
  keyPrefix: "campus_events",
  maxRequests: 60,
});
