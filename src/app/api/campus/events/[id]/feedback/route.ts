// /api/campus/events/[id]/feedback/route.ts
// POST — the student's post-event feedback (1-5 + tags + note). The
// VERIFY step of the event loop. Upserts on (event_id, user_id); marks
// the registration feedback_given.

import { NextRequest, NextResponse } from "next/server";
import { type AuthContext } from "@/middleware/authorization";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { query } from "@/lib/postgres";

function getEventId(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("events");
  return idx >= 0 ? parts[idx + 1] ?? "" : "";
}

async function handlePost(req: NextRequest, ctx: { auth: AuthContext }) {
  const eventId = getEventId(req);
  if (!eventId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_EVENT_ID" } },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { success: false, error: { code: "BAD_RATING", message: "rating must be 1 to 5" } },
      { status: 400 },
    );
  }
  const tags = Array.isArray(body.tags) ? (body.tags as string[]).slice(0, 10) : [];
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : null;

  // Confirm the user registered for this event.
  const { rows: regRows } = await query(
    `SELECT 1 FROM public.event_registrations
     WHERE event_id = $1 AND user_id = $2 AND status = 'attended' LIMIT 1`,
    [eventId, ctx.auth.userId],
  );
  if (regRows.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_ATTENDED" } },
      { status: 403 },
    );
  }

  // Upsert the feedback + mark the registration.
  await query(
    `INSERT INTO public.event_feedback (event_id, user_id, rating, tags, note)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (event_id, user_id) DO UPDATE
       SET rating = EXCLUDED.rating, tags = EXCLUDED.tags, note = EXCLUDED.note, updated_at = NOW()`,
    [eventId, ctx.auth.userId, rating, tags, note],
  );
  await query(
    `UPDATE public.event_registrations SET feedback_given = TRUE
     WHERE event_id = $1 AND user_id = $2`,
    [eventId, ctx.auth.userId],
  ).catch(() => {}); // column may not exist until the migration runs

  return NextResponse.json({ success: true, rating, tags });
}

export const POST = withMutationGuard(handlePost, {
  requiredRole: ["student", "guardian", "parent", "admin", "sysadmin"],
  rateLimit: { maxRequests: 10, windowMs: 60_000 },
});
