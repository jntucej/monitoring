// /api/class-sessions/confirmations/today
//
// GET — the faculty's (or an authority's) today's scheduled sessions with
// their confirmation state. Drives the "Confirm all my classes today" card:
// one row per session (class, period, time) + a confirm/no-show/substituted
// flag + a "confirm all today" bulk affordance.
//
// Auth: faculty sees their own sessions; an authority (hod/vp/principal/
// admin/sysadmin) can see any (optionally scoped by ?facultyId=).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { classSessionsForDateAll, toISTDateForCron, sessionIdFor } from "@/lib/class-session";
import type { AuthContext } from "@/lib/authContext";

const AUTHORITY = ["hod", "vp", "principal", "admin", "sysadmin"];

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const isAuthority = AUTHORITY.includes(auth.role);
  const url = new URL(req.url);
  const explicitFaculty = url.searchParams.get("facultyId");

  // Which faculty's sessions?
  let facultyId: string | null = null;
  if (auth.role === "faculty") {
    facultyId = auth.userId;
  } else if (isAuthority) {
    facultyId = explicitFaculty ?? null; // null = all (authority overview)
  } else {
    return fail("FORBIDDEN", "Only faculty or an authority may view today's confirmations", 403);
  }

  const now = new Date();
  const today = toISTDateForCron(now);
  const sessions = await classSessionsForDateAll(today);

  // Scope to the acting faculty's sessions (or all for an authority).
  const scoped = facultyId
    ? sessions.filter((s) => s.facultyId === facultyId)
    : sessions;

  // Pull the confirmation state for each (session, faculty).
  const out = await Promise.all(
    scoped.map(async (s) => {
      if (!s.facultyId) return null;
      const sessionId = sessionIdFor(s.classId, s.subjectCode, s.date, s.period);
      const { rows: cls } = await query<{ name: string | null }>(
        `SELECT name FROM public.classes WHERE id = $1::uuid LIMIT 1`,
        [s.classId],
      );
      let state = "NOT_SCHEDULED";
      let confirmedAt: string | null = null;
      let substitute: string | null = null;
      const { rows: conf } = await query<{ status: string; confirmed_at: string; substitute_faculty_id: string }>(
        `SELECT status, confirmed_at::text AS confirmed_at, substitute_faculty_id::text AS substitute_faculty_id
           FROM public.class_confirmations
          WHERE session_id = $1 AND faculty_id = $2 LIMIT 1`,
        [sessionId, s.facultyId],
      );
      if (conf[0]) {
        state = conf[0].status;
        confirmedAt = conf[0].confirmed_at || null;
        substitute = conf[0].substitute_faculty_id || null;
      }
      const startMs = Date.parse(s.startAt);
      const minsToStart = Math.round((startMs - Date.parse(new Date(now.getTime() + 5.5 * 3_600_000).toISOString())) / 60_000);
      return {
        sessionId,
        classId: s.classId,
        className: cls[0]?.name ?? s.classId,
        subjectCode: s.subjectCode,
        periodNo: s.period,
        sessionDate: s.date,
        startTime: s.label,
        hall: s.subjectCode ?? undefined,
        facultyId: s.facultyId,
        confirmationState: state,
        confirmedAt,
        substitute,
        minutesToStart: minsToStart,
      };
    }),
  );

  const rows = out.filter(Boolean) as Array<{
    sessionId: string; classId: string; className: string; subjectCode: string | null;
    periodNo: number; sessionDate: string; startTime: string; hall?: string;
    facultyId: string | null; confirmationState: string; confirmedAt: string | null;
    substitute: string | null; minutesToStart: number;
  }>;

  const pendingToday = rows.filter((r) => r.confirmationState === "PENDING" || r.confirmationState === "NOT_SCHEDULED").length;

  return ok({
    facultyId,
    date: today,
    sessions: rows,
    pendingToday,
    canConfirmAll: pendingToday > 0,
  });
}

export const GET = withAuthorization(handleGet);
