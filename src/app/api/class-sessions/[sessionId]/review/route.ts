// /api/class-sessions/[sessionId]/review
//
// POST — submit a student's review for a derived class session.
//
// Guarded (matches the paste's API-enforcement test spec):
//   1. only the student who is enrolled in the session's class can review it;
//   2. the session must have ENDED (endAt <= now) — you can't review a class
//      that hasn't happened;
//   3. exactly one review per (student, session) — a second attempt is 409
//      (ALREADY_REVIEWED), not a new row.
//
// The session is re-derived from the timetable by sessionId (the deterministic
// hash from class-session.ts). If the timetable was rescheduled, the id no
// longer matches a live period and the review is rejected (the review belongs
// to the session that actually happened).
//
// Faculty attribution comes from the session's faculty_id (the
// teaching-binding), so the review lands in the faculty's dashboard.

import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { submitReview } from "@/lib/class-reviews";
import type { AuthContext } from "@/lib/authContext";

function getSessionId(req: NextRequest): string {
  const segs = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segs[segs.length - 1] ?? "");
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (auth.role !== "student") {
    return fail("FORBIDDEN", "Only students can submit class reviews", 403);
  }
  const sessionId = getSessionId(req);
  if (!sessionId) return fail("VALIDATION_ERROR", "sessionId required", 400);

  const body = (await req.json().catch(() => ({}))) as {
    rating?: number;
    note?: string;
    isAnonymous?: boolean;
  };
  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return fail("VALIDATION_ERROR", "rating must be an integer 1–5", 400);
  }

  // Re-derive the session from the session-marker table (written by the
  // class-review-prompt cron for every ended session). This is the reliable
  // inverse of the deterministic session id.
  const { rows: marker } = await query<{
    class_id: string;
    period: number;
    faculty_id: string | null;
    session_date: string;
  }>(
    `SELECT class_id::text, period, faculty_id::text, session_date::text
       FROM public.class_session_markers WHERE session_id = $1 LIMIT 1`,
    [sessionId],
  );
  if (marker.length === 0) {
    return fail("SESSION_NOT_FOUND", "This session isn't on the timetable", 404);
  }
  const m = marker[0];
  const sessionDate = m.session_date;

  // Look up the live session row to verify it still exists + has ended.
  const { rows: sessions } = await query<{
    class_id: string;
    period_no: number;
    end_time: string;
    start_time: string;
    faculty_id: string | null;
    hall: string | null;
  }>(
    `SELECT cp.class_id::text, cp.period_no, cp.end_time::text, cp.start_time::text,
            cp.faculty_id::text, cp.hall
       FROM public.class_periods cp
      WHERE cp.class_id = $1::uuid AND cp.period_no = $2::int
      LIMIT 1`,
    [m.class_id, m.period],
  );
  if (sessions.length === 0) {
    return fail("SESSION_NOT_FOUND", "This session is no longer on the timetable", 404);
  }
  const s = sessions[0];
  const endISO = `${sessionDate}T${s.end_time}`;
  const nowISO = new Date().toISOString();
  if (endISO > nowISO) {
    return fail("SESSION_NOT_ENDED", "This class hasn't ended yet — review it later", 409);
  }
  const facultyId = s.faculty_id ?? m.faculty_id;
  if (!facultyId) {
    // A session with no assigned faculty can't be attributed; reject cleanly.
    return fail("NO_FACULTY", "No faculty is assigned to this period", 409);
  }

  // Enrollment check: the student must be in this class (section + year + dept).
  const { rows: enrolled } = await query<{ n: string }>(
    `SELECT 1 AS n
       FROM public.student_details sd
      WHERE sd.user_id::text = $1
        AND EXISTS (
             SELECT 1 FROM public.classes c
              WHERE c.id = $2::uuid
                AND c.section::text = sd.section::text
                AND c.year = sd.year
                AND c.department_id::text = sd.branch
          )
      LIMIT 1`,
    [auth.userId, s.class_id],
  );
  if (enrolled.length === 0) {
    return fail("NOT_ENROLLED", "You are not enrolled in this class", 403);
  }

  const isAnonymous = Boolean(body.isAnonymous);
  const result = await submitReview({
    sessionId,
    session: {
      id: sessionId,
      classId: s.class_id,
      subjectCode: s.hall ?? null,
      facultyId: facultyId,
      date: sessionDate,
      period: s.period_no,
      startAt: `${sessionDate}T${s.start_time}`,
      endAt: endISO,
      label: `Period ${s.period_no}`,
    },
    studentId: auth.userId,
    isAnonymous,
    rating: Math.round(rating),
    note: body.note,
  });

  if (!result.ok) {
    if (result.reason === "ALREADY_REVIEWED") {
      return fail("ALREADY_REVIEWED", "You already reviewed this session", 409);
    }
    return fail("REVIEW_ERROR", "Could not save your review", 500);
  }

  await addAudit({
    action: "CLASS_SESSION_REVIEW_SUBMITTED",
    userId: auth.userId,
    role: "student",
    details: { sessionId, classId: s.class_id, facultyId, rating },
  });

  return ok({ reviewId: result.id, sessionId, submitted: true });
}

export const POST = withMutationGuard(handlePost);
