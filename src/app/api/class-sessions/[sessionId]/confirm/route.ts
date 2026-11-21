// /api/class-sessions/[sessionId]/confirm
//
// POST { action: "confirm" | "request-substitute", substituteFacultyId?,
//       classId?, periodNo?, sessionDate?, facultyId? }
//
// A faculty confirms intent to teach a scheduled session (or requests a
// substitute). The session id is the deterministic sha256 from
// class-session.ts — it is NOT parseable, so the caller passes the session's
// class/period/date (which the UI + the cron that created the prompt already
// know). We verify a faculty is confirming their own scheduled slot before
// recording, so nobody confirms someone else's session. HODs/authorities can
// confirm on behalf (capability class.confirm.on_behalf) by passing facultyId.
//
// Idempotent: re-confirming is a no-op. On a new CONFIRMED, the class's
// students get a "class confirmed" notification (MyDayStrip shows it).

import { NextRequest } from "next/server";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { recordConfirmation } from "@/lib/class-confirmation";
import { addAudit, addNotification } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

const AUTHORITY = ["hod", "vp", "principal", "admin", "sysadmin"];

function getSessionId(req: NextRequest): string {
  // /api/class-sessions/<sessionId>/confirm → segment index 2
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 2] ?? "");
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const sessionId = getSessionId(req);
  if (!sessionId) return fail("MISSING_PARAM", "sessionId required", 400);

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    substituteFacultyId?: string;
    facultyId?: string;
    classId?: string;
    periodNo?: number;
    sessionDate?: string;
  };
  const action = body.action === "request-substitute" ? "request-substitute" : "confirm";
  const isAuthority = AUTHORITY.includes(auth.role);
  const classId = body.classId;
  const periodNo = body.periodNo;
  const sessionDate = body.sessionDate;

  // The class context is required to (a) verify ownership for a faculty and
  // (b) notify the right students. A session id alone can't be resolved.
  if (!classId || periodNo === undefined || !sessionDate) {
    return fail("VALIDATION_ERROR", "classId, periodNo and sessionDate are required with sessionId", 400);
  }

  // Determine whose session this is.
  let facultyId: string;
  if (auth.role === "faculty") {
    // Verify the scheduled faculty for this class/period/day is the caller.
    const dow = new Date(`${sessionDate}T00:00:00Z`).getUTCDay(); // 0=Sun, matches class_periods
    const { rows } = await query<{ faculty_id: string | null }>(
      `SELECT faculty_id::text AS faculty_id
         FROM public.class_periods
        WHERE class_id = $1::uuid AND period_no = $2 AND day_of_week = $3
        LIMIT 1`,
      [classId, periodNo, dow],
    );
    if (rows.length === 0) {
      return fail("NOT_FOUND", "No scheduled session for this class/period/day", 404);
    }
    if (rows[0].faculty_id && rows[0].faculty_id !== auth.userId) {
      return fail("FORBIDDEN", "This session is scheduled for a different faculty", 403);
    }
    facultyId = auth.userId;
  } else if (isAuthority) {
    if (!body.facultyId) {
      return fail("VALIDATION_ERROR", "Authority on-behalf requires facultyId", 400);
    }
    facultyId = body.facultyId;
  } else {
    return fail("FORBIDDEN", "Only faculty or an authority may confirm a class session", 403);
  }

  const result = await recordConfirmation({
    sessionId,
    facultyId,
    action,
    actorId: auth.userId,
    substituteFacultyId: body.substituteFacultyId,
    classId,
    periodNo,
    sessionDate,
  });

  // On a new CONFIRMED, notify the class's students (the student_details
  // section/year/branch join — the same query class-reminders uses).
  if (result.status === "CONFIRMED" && result.changed) {
    const { rows: cls } = await query<{ section: string; year: number; department_id: string }>(
      `SELECT c.section::text AS section, c.year::int AS year, c.department_id::text AS department_id
         FROM public.classes c WHERE c.id = $1::uuid LIMIT 1`,
      [classId],
    );
    const meta = cls[0];
    if (meta) {
      const students = await query<{ user_id: string }>(
        `SELECT sd.user_id::text FROM public.student_details sd
         WHERE sd.section::text = $1 AND sd.year = $2 AND sd.branch = $3
           AND EXISTS (SELECT 1 FROM public.users u
                       WHERE u.id::text = sd.user_id::text
                         AND u.role = 'student' AND u.status = 'ACTIVE')
         LIMIT 500`,
        [meta.section, meta.year, meta.department_id],
      );
      for (const s of students.rows) {
        await addNotification(
          "user",
          s.user_id,
          "class.confirmation.confirmed",
          `Class confirmed — Period ${periodNo}`,
          `Your scheduled class is confirmed for ${sessionDate}.`,
        );
      }
    }
  }

  await addAudit({
    action: action === "confirm" ? "CLASS_CONFIRMED" : "CLASS_SUBSTITUTE_REQUESTED",
    userId: auth.userId,
    role: auth.role,
    details: { sessionId, facultyId, action, classId, periodNo, sessionDate, onBehalf: isAuthority && auth.role !== "faculty" },
  });

  return ok({ sessionId, facultyId, classId, periodNo, sessionDate, ...result });
}

export const POST = withMutationGuard(handlePost);
