// /api/campus/events/me/registrations/route.ts
// GET — the current user's event registrations (RSVP + attendance).
// Used by the My Events page to show each event's status.

import { NextRequest } from "next/server";
import { withAuthorization, type AuthContext } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/postgres";

async function implGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const uid = ctx.auth.userId;

  const { rows } = await query(
    `SELECT er.id, er.event_id, er.status,
            ce.title, ce.location, ce.starts_at, ce.ends_at, ce.category
     FROM public.event_registrations er
     JOIN public.campus_events ce ON ce.id = er.event_id
     WHERE er.user_id = $1
     ORDER BY ce.starts_at DESC
     LIMIT 50`,
    [uid],
  );

  return Response.json({
    success: true,
    registrations: rows.map((r) => ({
      event_id: r.event_id,
      status: r.status,
      attended: r.status === "attended",
      title: r.title,
      location: r.location,
      starts_at: r.starts_at,
      ends_at: r.ends_at,
      category: r.category,
    })),
  });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["student", "guardian", "parent", "admin"] }),
  { keyPrefix: "events-me-regs", maxRequests: 60, windowMs: 60_000 },
);
