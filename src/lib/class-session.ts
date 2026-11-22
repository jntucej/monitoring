// src/lib/class-session.ts
//
// A "class session" is a single period of a single subject for a single class
// on a single day. It is DERIVED, not stored: the timetable lives in
// class_periods (period_no, day_of_week, start/end_time, faculty_id, class_id)
// and the faculty who teaches is the period's faculty_id (the teaching-binding
// is already the timetable row). A session's stable id is a deterministic
// hash of (classId, subjectCode, date, period) — if a period is rescheduled
// the id changes, which is correct: the review belongs to the session that
// actually happened.
//
// This module is the attribution backbone for the whole flow:
//   timetable → next-class notification → review → faculty dashboard.
// Every review carries a sessionId + facultyId resolved here, so reviews are
// attributable to a specific faculty's specific class session.
//
// Server-only: it reads the DB. Client code (MyDayStrip) already derives
// next-class from the timetable via the schedule API; this is the server-side
// twin used by the cron + review endpoints.

import { createHash } from "crypto";
import { query } from "@/lib/postgres";

export interface ClassSession {
  /** deterministic: `${classId}:${subjectCode}:${date}:${period}` (hashed). */
  id: string;
  classId: string;
  /** subject code for this period (may be null when the period has no subject). */
  subjectCode: string | null;
  /** the faculty who teaches this period (the teaching-binding). */
  facultyId: string | null;
  /** YYYY-MM-DD (IST). */
  date: string;
  /** period number on the timetable. */
  period: number;
  startAt: string;
  endAt: string;
  /** human label, e.g. "Period 3 · Physics · 10:30–11:20". */
  label: string;
}

/** Deterministic session id. Pure — no DB. */
export function sessionIdFor(
  classId: string,
  subjectCode: string | null,
  date: string,
  period: number,
): string {
  const raw = `${classId}:${subjectCode ?? "none"}:${date}:${period}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

function fmtTime(t: string | null): string {
  // t is a "HH:MM:SS" time-without-tz from class_periods.
  if (!t) return "—";
  return t.slice(0, 5);
}

/**
 * Derive the sessions (periods) for a class on a given day.
 * @param dateIST  YYYY-MM-DD in the institution's local date (IST).
 */
export async function classSessionsForDate(
  classId: string,
  dateIST: string,
): Promise<ClassSession[]> {
  const dow = dayOfWeekIST(dateIST); // 1=Mon..7=Sun (matches class_periods)
  const { rows } = await query<{
    period_no: number;
    start_time: string;
    end_time: string;
    faculty_id: string | null;
    hall: string | null;
  }>(
    `SELECT period_no, start_time, end_time, faculty_id, hall
       FROM public.class_periods
      WHERE class_id = $1::uuid AND day_of_week = $2
      ORDER BY period_no`,
    [classId, dow],
  );

  return rows.map((r) => {
    const subjectCode = r.hall ?? null; // hall doubles as the subject/room label
    const id = sessionIdFor(classId, subjectCode, dateIST, r.period_no);
    const start = `${dateIST}T${fmtTime(r.start_time)}`;
    const end = `${dateIST}T${fmtTime(r.end_time)}`;
    return {
      id,
      classId,
      subjectCode,
      facultyId: r.faculty_id,
      date: dateIST,
      period: r.period_no,
      startAt: start,
      endAt: end,
      label: `Period ${r.period_no} · ${fmtTime(r.start_time)}–${fmtTime(r.end_time)}`,
    };
  });
}

/**
 * The NEXT session for a class: the first period on `dateIST` whose endAt is
 * after `now` (or, if all have passed today, the next day's first period).
 * Used by the class.next reminder cron + the student "next class" card.
 */
export async function nextClassSession(
  classId: string,
  now: Date,
): Promise<ClassSession | null> {
  const today = toISTDate(now);
  const todaySessions = await classSessionsForDate(classId, today);
  const nowISO = now.toISOString();
  // First session whose window still matters (end not yet passed).
  const upcoming = todaySessions.find((s) => s.endAt >= nowISO) ?? todaySessions[0];
  if (upcoming) return upcoming;
  // Otherwise peek at tomorrow.
  const tomorrow = toISTDate(new Date(now.getTime() + 86_400_000));
  const tmr = await classSessionsForDate(classId, tomorrow);
  return tmr[0] ?? null;
}

/** All sessions that ENDED within the last `windowMs` (for the review prompt). */
export async function recentlyEndedSessions(
  now: Date,
  windowMs = 6 * 3_600_000,
): Promise<ClassSession[]> {
  const startISO = new Date(now.getTime() - windowMs).toISOString();
  const today = toISTDate(now);
  const out: ClassSession[] = [];
  // Today's sessions that ended in the window.
  for (const s of await classSessionsForDateAll(today)) {
    if (s.endAt <= now.toISOString() && s.endAt >= startISO) out.push(s);
  }
  return out;
}

/** Derive sessions for EVERY class on a day (for the cron sweep). */
export async function classSessionsForDateAll(
  dateIST: string,
): Promise<ClassSession[]> {
  const dow = dayOfWeekIST(dateIST);
  const { rows } = await query<{
    class_id: string;
    period_no: number;
    start_time: string;
    end_time: string;
    faculty_id: string | null;
    hall: string | null;
  }>(
    `SELECT class_id, period_no, start_time, end_time, faculty_id, hall
       FROM public.class_periods
      WHERE day_of_week = $1
      ORDER BY class_id, period_no`,
    [dow],
  );
  return rows.map((r) => {
    const subjectCode = r.hall ?? null;
    const id = sessionIdFor(r.class_id, subjectCode, dateIST, r.period_no);
    const start = `${dateIST}T${fmtTime(r.start_time)}`;
    const end = `${dateIST}T${fmtTime(r.end_time)}`;
    return {
      id,
      classId: r.class_id,
      subjectCode,
      facultyId: r.faculty_id,
      date: dateIST,
      period: r.period_no,
      startAt: start,
      endAt: end,
      label: `Period ${r.period_no} · ${fmtTime(r.start_time)}–${fmtTime(r.end_time)}`,
    };
  });
}

// ── date helpers (IST) ────────────────────────────────────────────────────────
function toISTDate(d: Date): string {
  // IST is UTC+5:30, fixed offset, so a date string in IST is stable.
  return new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}
/** Cron entry-point: the IST calendar date for "now". */
export function toISTDateForCron(now: Date): string {
  return toISTDate(now);
}
/** 1-indexed day-of-week (1=Mon..7=Sun) for the IST calendar day of a date.
 *  class_periods.day_of_week is 1-indexed 1..7 (DB CHECK constraint), so the
 *  value must NOT be the JS 0=Sun..6=Sat form. */
function dayOfWeekIST(dateIST: string): number {
  // Parse the IST date as UTC so getUTCDay() reflects that calendar day
  // (0=Sun..6=Sat), then map to 1=Mon..7=Sun: ((dow+6)%7)+1.
  const gdc = new Date(dateIST + "T00:00:00Z").getUTCDay();
  return ((gdc + 6) % 7) + 1;
}
