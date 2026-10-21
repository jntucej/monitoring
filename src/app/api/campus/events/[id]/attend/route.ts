import { assertCsrf } from "@/lib/csrf";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/dbClient";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit, type RateLimitConfig } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/config/app-constants";
import { requireTrustedHeaders } from "@/server/http/trusted-headers";
import { err } from "@/lib/api-response";
import { awardAchievement } from "@/lib/achievement-engine";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

/** Only the organizer set may mark attendance. */
const ATTEND_ROLES: readonly Role[] = [
  "admin",
  "sysadmin",
  "supervisor",
  "faculty",
] as const;

/**
 * POST /api/campus/events/[id]/attend
 *
 * Marks an event registration as attended. Body may include
 * `{ registrationId? }`; when omitted the caller's own registration
 * for the event is used. After the first attendance for a user, the
 * first_attendance achievement is awarded.
 */
async function handlePost(
  req: NextRequest,
  { auth }: { auth: AuthContext }
): Promise<Response> {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const untrusted = requireTrustedHeaders(req);
  if (untrusted) return untrusted;

  const role = auth.role as Role;
  if (!ATTEND_ROLES.includes(role)) {
    const { body, status } = err(
      "FORBIDDEN",
      "Only organizers may mark attendance.",
      403
    );
    return NextResponse.json(body, { status });
  }

  const supabase = getSupabaseServiceClient();

  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const eventId = decodeURIComponent(segments[segments.length - 2]);
  if (
    !eventId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)
  ) {
    const { body, status } = err("BAD_REQUEST", "Invalid event id", 400);
    return NextResponse.json(body, { status });
  }

  const body = await req.json().catch(() => null);
  const registrationId =
    body && typeof body.registrationId === "string" ? body.registrationId : null;

  type Registration = { id: string; user_id: string; status: string };
  let registration: Registration | null = null;

  if (registrationId) {
    const { data, error } = await supabase
      .from("event_registrations")
      .select("id, user_id, status")
      .eq("id", registrationId)
      .eq("event_id", eventId)
      .maybeSingle();
    if (error) {
      const { body: b, status: s } = err("SERVER_ERROR", error.message, 500);
      return NextResponse.json(b, { status: s });
    }
    registration = data as Registration | null;
  } else {
    // Fall back to the caller's own registration for this event.
    const { data, error } = await supabase
      .from("event_registrations")
      .select("id, user_id, status")
      .eq("event_id", eventId)
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (error) {
      const { body: b, status: s } = err("SERVER_ERROR", error.message, 500);
      return NextResponse.json(b, { status: s });
    }
    registration = data as Registration | null;
  }

  if (!registration) {
    const { body, status } = err(
      "NOT_FOUND",
      "No active registration found for this event.",
      404
    );
    return NextResponse.json(body, { status });
  }

  const { data: updated, error: upErr } = await supabase
    .from("event_registrations")
    .update({ status: "attended" })
    .eq("id", registration.id)
    .select("id, user_id, status, event_id")
    .single();
  if (upErr) {
    const { body, status } = err("SERVER_ERROR", upErr.message, 500);
    return NextResponse.json(body, { status });
  }

  // Non-fatal: award first_attendance on the user's first attended event.
  const attendedUserId = (updated as unknown as { user_id: string }).user_id;
  const { count: priorCount, error: countErr } = await supabase
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", attendedUserId)
    .eq("status", "attended")
    .neq("id", registration.id);

  if (!countErr && (!priorCount || priorCount === 0)) {
    void awardAchievement(attendedUserId, "first_attendance");
  }

  return NextResponse.json({ success: true, data: { attended: true } });
}

const attendLimit: RateLimitConfig = { ...RATE_LIMITS.mutation, keyPrefix: "event_attend" };

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: [...ATTEND_ROLES] }),
  attendLimit
);
