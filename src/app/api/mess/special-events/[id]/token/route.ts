import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { issueToken } from "@/lib/mess-event-token";
import { classifyHostelStatus } from "@/lib/mess-reviews";
import type { AuthContext } from "@/lib/authContext";

function eventIdFromUrl(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const i = parts.lastIndexOf("token");
  return i > 0 ? parts[i - 1] : "";
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (auth.role !== "student")
    return fail("FORBIDDEN", "Only students can generate meal tokens", 403);
  const eventId = eventIdFromUrl(req);
  if (!eventId) return fail("VALIDATION_ERROR", "Missing event id", 400);

  const { rows } = await query<{
    status: string; event_date: string; interest_deadline: string;
    serving_start_at: string; serving_end_at: string; hostel_only: boolean;
    role: string; student_type: string | null; current_entry_type: string | null;
    hostel_block: string | null;
  }>(
    `SELECT e.status, e.event_date::text, e.interest_deadline,
            e.serving_start_at, e.serving_end_at, e.hostel_only,
            u.role, sd.student_type, sd.current_entry_type, sd.hostel_block
       FROM public.mess_special_events e
       JOIN public.users u ON u.id = $2
       LEFT JOIN public.student_details sd ON sd.user_id = u.id
      WHERE e.id = $1`,
    [eventId, auth.userId],
  );
  const ev = rows[0];
  if (!ev) return fail("NOT_FOUND", "Event not found", 404);

  // Hostel-only gate — the most important security check for the token flow.
  if (ev.hostel_only) {
    const hostel = classifyHostelStatus({
      role: ev.role,
      student_type: ev.student_type,
      current_entry_type: ev.current_entry_type,
      hostel_block: ev.hostel_block,
    });
    if (!hostel.isHostelStudent) {
      return fail(
        "FORBIDDEN",
        hostel.reason === "day_scholar"
          ? "Day scholars are not eligible for hostel mess tokens"
          : "Only hostel students can generate mess tokens",
        403,
      );
    }
  }

  if (ev.status === "CANCELLED") return fail("CONFLICT", "Event was cancelled", 409);
  if (ev.status === "CLOSED") return fail("CONFLICT", "Event is closed", 409);
  if (Date.now() < new Date(ev.interest_deadline).getTime())
    return fail("CONFLICT", "Interest deadline has not passed yet", 409);
  if (Date.now() < new Date(ev.serving_start_at).getTime() - 3_600_000)
    return fail("CONFLICT", "Tokens are not issued more than 1 hour before serving", 409);
  if (Date.now() > new Date(ev.serving_end_at).getTime())
    return fail("CONFLICT", "Serving window has ended", 409);

  const existing = await query<{ jti: string; expires_at: string; used_at: string | null }>(
    `SELECT jti, expires_at, used_at FROM public.mess_event_tokens
      WHERE user_id = $1 AND event_id = $2`,
    [auth.userId, eventId],
  );
  if (existing.rows[0]?.used_at)
    return fail("CONFLICT", "Your token has already been used", 409);

  let result: { token: { jti: string; qrToken: string; manualCode: string; itemIds: string[]; itemLabels: string[]; expiresAt: string }; created: boolean };
  try {
    result = await issueToken({
      userId: auth.userId,
      eventId,
      expiresAt: new Date(ev.serving_end_at),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "NO_INTERESTS")
      return fail("CONFLICT", "You have no registered interest for this event", 409);
    if (msg === "TOKEN_ALREADY_USED")
      return fail("CONFLICT", "Your token has already been used", 409);
    if (msg === "TOKEN_REVOKED")
      return fail("CONFLICT", "Your token was revoked. Ask the mess in-charge to re-issue.", 409);
    return fail("INTERNAL", "Could not issue token", 500);
  }

  if (result.created) {
    await addAudit({
      action: "MESS_TOKEN_GENERATED",
      userId: auth.userId,
      role: auth.role,
      details: { eventId, jti: result.token.jti, itemCount: result.token.itemIds.length },
    });
  }

  // qrToken is safe to return to the student — it's signed. The manual code is
  // only returned on first issue; re-fetches return an empty string.
  return ok({
    created: result.created,
    token: {
      jti: result.token.jti,
      qrToken: result.token.qrToken,
      manualCode: result.token.manualCode,
      itemIds: result.token.itemIds,
      itemLabels: result.token.itemLabels,
      expiresAt: result.token.expiresAt,
    },
  });
}

export const GET = withAuthorization(
  withRateLimit(handleGet, { windowMs: 60_000, maxRequests: 30 }),
  {},
);
