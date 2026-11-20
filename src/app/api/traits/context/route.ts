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
import { query } from "@/lib/postgres";

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const claims: AuthTokenClaims | null = await verifyAccessToken(token);
  if (!claims?.id) return Response.json({ success: false, error: "Invalid token" }, { status: 401 });

  const now = new Date();

  // Calendar: check if we're in an exam week (from the academic calendar table).
  // Fallback: false if the table doesn't exist yet (graceful degradation).
  let examWeekActive = false;
  let semesterStart = false;
  try {
    const cal = await query<{ exam_from: string | null; exam_to: string | null; sem_start: string | null }>(
      `SELECT exam_from, exam_to, sem_start FROM public.academic_calendar
       WHERE academic_year = EXTRACT(YEAR FROM now()) LIMIT 1`,
    );
    if (cal.rows[0]) {
      const { exam_from, exam_to, sem_start } = cal.rows[0];
      const nowMs = now.getTime();
      examWeekActive = !!(exam_from && exam_to && nowMs >= new Date(exam_from).getTime() && nowMs <= new Date(exam_to).getTime());
      // Semester start: first 2 weeks of the semester.
      if (sem_start) {
        const semStartMs = new Date(sem_start).getTime();
        semesterStart = nowMs >= semStartMs && nowMs <= semStartMs + 14 * 86_400_000;
      }
    }
  } catch {
    // academic_calendar table doesn't exist yet — all false.
  }

  // Weather: monsoon check (simplified: June–September = monsoon season in India).
  // A real implementation would call a weather API; this is the seasonal heuristic.
  const month = now.getMonth(); // 0-indexed
  const monsoon = month >= 5 && month <= 8; // Jun (5) – Sep (8)

  // Roster: the user's shift from the duty roster (fallback: null = no shift).
  let shift: "morning" | "evening" | "night" | null = null;
  try {
    const roster = await query<{ shift: string }>(
      `SELECT shift FROM public.duty_roster WHERE user_id = $1 AND date = CURRENT_DATE LIMIT 1`,
      [claims.id],
    );
    if (roster.rows[0]?.shift) shift = roster.rows[0].shift as "morning" | "evening" | "night";
  } catch {
    // duty_roster table doesn't exist yet — null.
  }

  // On-call: pager schedule (fallback: false).
  let onCall = false;
  try {
    const pager = await query<{ on_call: boolean }>(
      `SELECT on_call FROM public.pager_schedule WHERE user_id = $1 AND date = CURRENT_DATE LIMIT 1`,
      [claims.id],
    );
    onCall = pager.rows[0]?.on_call ?? false;
  } catch {
    // pager_schedule table doesn't exist yet — false.
  }

  return Response.json({
    success: true,
    now: now.toISOString(),
    calendar: { examWeekActive, semesterStart },
    weather: { monsoon },
    roster: { shift },
    onCall,
  });
}
