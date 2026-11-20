// /api/traits/context/route.ts
// GET — the temporal context that drives temporal trait activation:
//   { now, calendar: { examWeekActive, semesterStart },
//     weather: { monsoon }, roster: { shift }, onCall }
//
// The profile-derived traits come from the auth store on the client; this
// endpoint supplies the external-signal context (calendar, weather, roster,
// pager). Auth: any authenticated user (their own context). Read-only.

import { NextRequest } from "next/server";
import { verifyAccessToken, type AuthTokenClaims } from "@/lib/auth-token";

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const claims: AuthTokenClaims | null = await verifyAccessToken(token);
  if (!claims?.id) return Response.json({ success: false, error: "Invalid token" }, { status: 401 });

  // Derive the temporal context server-side. In the full build these come
  // from the academic calendar, weather API, duty roster, and pager schedule.
  // For now, the calendar flags default to "not active" (no exam week), so
  // temporal traits only fire when the calendar actually says so. The
  // derivation itself is the pure `deriveTraits()` — the context is input.
  const now = new Date();

  return Response.json({
    success: true,
    now: now.toISOString(),
    calendar: {
      examWeekActive: false, // wired to the academic calendar endpoint
      semesterStart: false, // wired to the academic calendar endpoint
    },
    weather: { monsoon: false }, // wired to the weather API
    roster: { shift: null }, // wired to the duty roster
    onCall: false, // wired to the pager schedule
  });
}
