// /api/cron/class-reminders
//
// POST — runs on a schedule (follows the existing cron route pattern). For
// every active class that has a period starting within the reminder window
// (default 15 min, the institutional setting `class_reminder_minutes`), emits
// a `class.next` notification to the students in that class, so their
// MyDayStrip / NotificationBell start receiving live next-class reminders.
//
// Idempotent per (student, session): a student gets at most one class.next
// nudge per session, guarded by the class_next_markers side table. No new
// review table, no websocket — a cron + the existing in-app notification
// channel, exactly as the plan requires.

import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query, addNotification, addAudit } from "@/lib/db";
import { errMsg } from "@/lib/err-msg";
import { toISTDateForCron } from "@/lib/class-session";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const now = new Date();
    const today = toISTDateForCron(now);
    const windowMin = Number(process.env.CLASS_REMINDER_MINUTES ?? "15");
    const windowEndISO = new Date(now.getTime() + windowMin * 60_000).toISOString();

    // Active classes + their periods that fall in the reminder window.
    // class_periods.day_of_week uses the JS getDay() convention (0=Sun) — the
    // same convention class-session.ts + gate-schedule.ts use. We compute the
    // weekday in JS (IST) and pass it, matching against today's periods.
    const dowIST = new Date(`${today}T00:00:00Z`).getUTCDay();
    const windows = await query<{
      class_id: string;
      period_no: number;
      start_time: string;
      end_time: string;
      hall: string | null;
      section: string;
      year: number;
      department_id: string;
    }>(
      `SELECT cp.class_id::text, cp.period_no, cp.start_time::text,
              cp.end_time::text, cp.hall, c.section::text, c.year, c.department_id::text
         FROM public.class_periods cp
         JOIN public.classes c ON c.id = cp.class_id
        WHERE c.is_active = TRUE
          AND cp.day_of_week = $2
        ORDER BY cp.class_id, cp.period_no`,
      [today, dowIST],
    );

    let reminded = 0;
    const perClass: Array<{ classId: string; period: number; students: number }> = [];

    for (const w of windows.rows) {
      const startISO = `${today}T${w.start_time}`;
      if (startISO < now.toISOString() || startISO > windowEndISO) continue;

      const sessionId = `${w.class_id}:${w.hall ?? "none"}:${today}:${w.period_no}`;

      // Students in this class (matched by section + year + department/branch).
      const students = await query<{ user_id: string }>(
        `SELECT sd.user_id::text FROM public.student_details sd
         WHERE sd.section::text = $1::text
           AND sd.year = $2::int
           AND sd.branch = $3::text
           AND NOT EXISTS (
                 SELECT 1 FROM public.class_next_markers m
                  WHERE m.user_id = sd.user_id::uuid AND m.session_id = $4
               )
           AND EXISTS (SELECT 1 FROM public.users u
                       WHERE u.id::text = sd.user_id::text
                         AND u.role = 'student' AND u.status = 'ACTIVE')
         LIMIT 500`,
        [w.section, w.year, w.department_id, sessionId],
      );

      for (const s of students.rows) {
        await addNotification(
          "user",
          s.user_id,
          "class.next",
          "Next class starting soon",
          `Period ${w.period_no} · ${w.start_time.slice(0, 5)}–${w.end_time.slice(0, 5)}${w.hall ? ` · ${w.hall}` : ""}`,
        );
        // Record the marker so the next run doesn't re-nudge this session.
        await query(
          `INSERT INTO public.class_next_markers (user_id, session_id, class_id, period)
           VALUES ($1::uuid, $2, $3::uuid, $4)
           ON CONFLICT (user_id, session_id) DO NOTHING`,
          [s.user_id, sessionId, w.class_id, w.period_no],
        ).catch(() => {
          /* marker is best-effort; the notification already fired */
        });
        reminded += 1;
      }
      perClass.push({ classId: w.class_id, period: w.period_no, students: students.rows.length });
    }

    await addAudit({
      action: "CLASS_REMINDERS_SWEEP",
      userId: "system-cron",
      userName: "Cron Scheduler",
      role: "sysadmin",
      details: { date: today, windowMin, reminded, classes: perClass.length },
    });

    return NextResponse.json({ ok: true, reminded, classes: perClass.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 500 });
  }
}
