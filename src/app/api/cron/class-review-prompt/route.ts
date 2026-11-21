// /api/cron/class-review-prompt
//
// POST — runs on a schedule. For every class session that has ENDED within
// the prompt window (default: last 6h), it:
//   1. writes a class_session_markers row (session_id → class/period/faculty/
//      date) so the review endpoint can resolve the session id;
//   2. sends a `class.review.prompt` notification to the students enrolled in
//      that class, inviting them to review the session.
//
// Idempotent per (student, session): a student is prompted at most once per
// session, guarded by a NOT EXISTS on notifications (type class.review.prompt
// + the session id in data). No websocket — cron + the in-app channel.

import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query, addNotification, addAudit } from "@/lib/db";
import { errMsg } from "@/lib/err-msg";
import {
  classSessionsForDateAll,
  sessionIdFor,
  toISTDateForCron,
} from "@/lib/class-session";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const now = new Date();
    const windowHours = Number(process.env.CLASS_REVIEW_PROMPT_HOURS ?? "6");
    const sinceISO = new Date(now.getTime() - windowHours * 3_600_000).toISOString();
    const today = toISTDateForCron(now);

    // Recently-ended sessions (all classes) whose endAt falls in the window.
    const all = await classSessionsForDateAll(today);
    const ended = all.filter((s) => s.endAt > sinceISO && s.endAt <= now.toISOString());

    let prompted = 0;
    const perSession: Array<{ sessionId: string; students: number }> = [];

    for (const s of ended) {
      if (!s.facultyId) continue; // can't attribute without a faculty
      const sessionId = s.id;

      // 1. Marker (the review endpoint's inverse of the session id).
      await query(
        `INSERT INTO public.class_session_markers
           (session_id, class_id, period, faculty_id, session_date)
         VALUES ($1, $2::uuid, $3::int, $4::uuid, $5::date)
         ON CONFLICT (session_id) DO NOTHING`,
        [sessionId, s.classId, s.period, s.facultyId, s.date],
      ).catch(() => {
        /* marker is best-effort */
      });

      // 2. Prompt the students in this class (section + year + dept match),
      //    once per (student, session) — guarded by class_review_prompt_markers.
      const { rows: classes } = await query<{
        section: string;
        year: number;
        department_id: string;
      }>(
        `SELECT section::text, year, department_id::text FROM public.classes WHERE id = $1::uuid LIMIT 1`,
        [s.classId],
      );
      if (classes.length === 0) continue;
      const c = classes[0];

      const { rows: students } = await query<{ user_id: string }>(
        `SELECT sd.user_id::text FROM public.student_details sd
          WHERE sd.section::text = $1::text
            AND sd.year = $2::int
            AND sd.branch = $3::text
            AND NOT EXISTS (
                  SELECT 1 FROM public.class_review_prompt_markers m
                   WHERE m.user_id = sd.user_id::uuid AND m.session_id = $4
               )
            AND EXISTS (SELECT 1 FROM public.users u
                       WHERE u.id::text = sd.user_id::text
                         AND u.role = 'student' AND u.status = 'ACTIVE')
          LIMIT 500`,
        [c.section, c.year, c.department_id, sessionId],
      );

      for (const stu of students) {
        await addNotification(
          "user",
          stu.user_id,
          "class.review.prompt",
          "How was that class?",
          `Tap to share a quick review of ${s.label}.`,
        );
        // Record the prompt marker so the next run doesn't re-prompt.
        await query(
          `INSERT INTO public.class_review_prompt_markers (user_id, session_id, class_id, period)
           VALUES ($1::uuid, $2, $3::uuid, $4)
           ON CONFLICT (user_id, session_id) DO NOTHING`,
          [stu.user_id, sessionId, s.classId, s.period],
        ).catch(() => {
          /* marker is best-effort; the prompt already fired */
        });
        prompted += 1;
      }
      perSession.push({ sessionId, students: students.length });
    }

    await addAudit({
      action: "CLASS_REVIEW_PROMPT_SWEEP",
      userId: "system-cron",
      userName: "Cron Scheduler",
      role: "sysadmin",
      details: { date: today, windowHours, prompted, sessions: perSession.length },
    });

    return NextResponse.json({ ok: true, prompted, sessions: perSession.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 500 });
  }
}
