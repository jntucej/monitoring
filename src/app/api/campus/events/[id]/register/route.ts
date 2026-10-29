import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import { awardAchievement } from "@/lib/achievement-engine";
import type { AuthContext } from "@/lib/authContext";

function getEventId(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("events");
  return idx >= 0 ? parts[idx + 1] ?? "" : "";
}

async function activeRegistrationCount(
  supabase: ReturnType<typeof getSupabaseServiceClient>,
  eventId: string
): Promise<number> {
  const { count } = await supabase
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("status", ["registered", "attended"]);
  return count ?? 0;
}

async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const eventId = getEventId(req);
  if (!eventId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_EVENT_ID", message: "event id required" } },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();
  const { data: event, error: evErr } = await supabase
    .from("campus_events")
    .select("id, title, starts_at, capacity, is_published, is_public")
    .eq("id", eventId)
    .maybeSingle();

  if (evErr || !event) {
    return NextResponse.json(
      { success: false, error: { code: "EVENT_NOT_FOUND", message: "Event not found" } },
      { status: 404 }
    );
  }

  if (!event.is_published || !event.is_public) {
    return NextResponse.json(
      { success: false, error: { code: "EVENT_NOT_PUBLIC", message: "Event is not open for registration" } },
      { status: 403 }
    );
  }

  if (event.starts_at && new Date(event.starts_at).getTime() < Date.now()) {
    return NextResponse.json(
      { success: false, error: { code: "EVENT_STARTED", message: "Registration closed — event has started" } },
      { status: 409 }
    );
  }

  const { data: existing } = await supabase
    .from("event_registrations")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (existing && existing.status !== "cancelled") {
    return NextResponse.json(
      { success: true, data: { eventId, status: existing.status, alreadyRegistered: true } }
    );
  }

  if (event.capacity && event.capacity > 0) {
    // Atomic insert with subquery capacity check to eliminate TOCTOU race conditions
    const insertRes = await query<{ id: string }>(
      `INSERT INTO public.event_registrations (event_id, user_id, status, registered_at)
       SELECT $1, $2, 'registered', NOW()
       WHERE (
         SELECT COUNT(*) FROM public.event_registrations
         WHERE event_id = $1 AND status IN ('registered', 'attended')
       ) < $3
       ON CONFLICT (event_id, user_id) DO UPDATE
         SET status = 'registered', registered_at = NOW()
         WHERE event_registrations.status = 'cancelled'
       RETURNING id`,
      [eventId, auth.userId, event.capacity]
    ).catch((err) => ({ rows: [], error: err }));

    if ("error" in insertRes && insertRes.error) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: String(insertRes.error) } },
        { status: 500 }
      );
    }

    if (insertRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "EVENT_FULL", message: "Event is at capacity" } },
        { status: 409 }
      );
    }
  } else {
    const { error: insErr } = await supabase
      .from("event_registrations")
      .upsert(
        { event_id: eventId, user_id: auth.userId, status: "registered", registered_at: new Date().toISOString() },
        { onConflict: "event_id,user_id" }
      );

    if (insErr) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: insErr.message } },
        { status: 500 }
      );
    }
  }

  await awardAchievement(auth.userId, "event_participation").catch(() => undefined);

  return NextResponse.json({
    success: true,
    data: { eventId, status: "registered" },
  });
}

export const POST = withRateLimit(withAuthorization(handlePost), {
  windowMs: 60_000,
  maxRequests: 30,
});
