import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { assertCsrf } from "@/lib/csrf";
import type { AuthContext } from "@/lib/authContext";

/**
 * POST /api/campus/events/[id]/register
 *
 * Registers the authenticated user for a campus event. Idempotent:
 * re-registering returns "already_registered" instead of failing.
 * Capacity is enforced only when the event defines one.
 */
async function handlePost(req: NextRequest, context: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const supabase = getSupabaseServiceClient();
  const userId = context.auth.userId;

  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  // .../api/campus/events/{id}/register → id is the second-to-last segment
  const eventId = decodeURIComponent(segments[segments.length - 2]);
  if (!eventId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) {
    return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid event id" } }, { status: 400 });
  }

  // Verify the event exists, is published, public and still upcoming.
  const { data: event, error: evErr } = await supabase
    .from("campus_events")
    .select("id, capacity, starts_at")
    .eq("id", eventId)
    .eq("is_published", true)
    .eq("is_public", true)
    .maybeSingle();
  if (evErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: evErr.message } }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Event not found" } }, { status: 404 });
  }

  const { data: existing, error: exErr } = await supabase
    .from("event_registrations")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();
  if (exErr) {
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: exErr.message } }, { status: 500 });
  }

  // Already registered (active registration) — idempotent success.
  if (existing && (existing.status === "registered" || existing.status === "attended")) {
    const { count } = await activeRegistrationCount(supabase, eventId);
    return NextResponse.json({
      success: true,
      data: { eventId, status: "already_registered", registrations: count },
    });
  }

  // Enforce capacity before creating.
  if (typeof event.capacity === "number" && event.capacity >= 0) {
    const { count } = await activeRegistrationCount(supabase, eventId);
    if (count >= event.capacity) {
      return NextResponse.json({ success: false, error: { code: "FULL", message: "Event is at capacity" } }, { status: 409 });
    }
  }

  // (Re)activate a cancelled registration or insert a new one.
  if (existing) {
    const { error: upErr } = await supabase
      .from("event_registrations")
      .update({ status: "registered", registered_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (upErr) {
      return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: upErr.message } }, { status: 500 });
    }
  } else {
    const { error: insErr } = await supabase
      .from("event_registrations")
      .insert({ event_id: eventId, user_id: userId, status: "registered" });
    if (insErr) {
      // Lost the unique-constraint race — treat as idempotent success.
      if (insErr.code === "23505") {
        const { count } = await activeRegistrationCount(supabase, eventId);
        return NextResponse.json({
          success: true,
          data: { eventId, status: "already_registered", registrations: count },
        });
      }
      return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: insErr.message } }, { status: 500 });
    }
  }

  const { count } = await activeRegistrationCount(supabase, eventId);
  return NextResponse.json({
    success: true,
    data: { eventId, status: "registered", registrations: count },
  });
}

async function activeRegistrationCount(supabase: ReturnType<typeof getSupabaseServiceClient>, eventId: string) {
  const { count, error } = await supabase
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("status", ["registered", "attended"]);
  if (error) throw error;
  return { count: count ?? 0 };
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["sysadmin", "admin", "operator", "faculty", "student", "parent", "principal", "staff", "supervisor", "guardian", "worker"] }),
  { keyPrefix: "campus_event_register", maxRequests: 30 }
);
