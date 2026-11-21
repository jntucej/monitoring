// /api/cron/assignment-due-reminders
//
// POST — runs every 15 minutes (same cadence as the other class crons).
// Two job types in one pass (the plan's "one cron, two job types"):
//   1. due.soon — for each assignment whose due_at is within the next 1h,
//      nudge every student who has NOT yet submitted (deduped by
//      assignment_reminder_markers kind='due_soon').
//   2. pending  — for each assignment whose due_at passed within the last 1h
//      and still has PENDING students, nudge the faculty once to confirm who
//      has / has not submitted (deduped by kind='pending').
//
// No new dashboards, no websockets — a cron + the existing in-app channel.

import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query, addNotification } from "@/lib/db";
import { errMsg } from "@/lib/err-msg";

const DUE_SOON_AHEAD_MIN = Number(process.env.ASSIGNMENT_DUE_SOON_AHEAD_MIN ?? "60");
const PENDING_AFTER_MIN = Number(process.env.ASSIGNMENT_PENDING_AFTER_MIN ?? "60");

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const dueSoonCutoff = new Date(now + DUE_SOON_AHEAD_MIN * 60_000).toISOString();
    const pendingCutoff = new Date(now - PENDING_AFTER_MIN * 60_000).toISOString();

    let dueSoonSent = 0;
    let pendingSent = 0;

    // ── 1. due.soon: assignments due within the next DUE_SOON_AHEAD_MIN ────
    const { rows: dueSoon } = await query<{
      id: string; title: string; class_id: string; due_at: string;
    }>(
      `SELECT id::text, title, class_id::text, due_at::text
         FROM public.assignments
        WHERE due_at::timestamptz > $1::timestamptz
          AND due_at::timestamptz <= $2::timestamptz`,
      [nowIso, dueSoonCutoff],
    );

    for (const a of dueSoon) {
      const { rows: students } = await query<{ user_id: string }>(
        `SELECT s.student_id::text FROM public.assignment_submissions s
          WHERE s.assignment_id = $1::uuid AND s.status = 'PENDING'
            AND EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = s.student_id::text
                        AND u.role = 'student' AND u.status = 'ACTIVE')`,
        [a.id],
      );
      for (const s of students) {
        const marker = await query(
          `INSERT INTO public.assignment_reminder_markers (user_id, assignment_id, kind)
           VALUES ($1::uuid, $2::uuid, 'due_soon')
           ON CONFLICT (user_id, assignment_id, kind) DO NOTHING
           RETURNING user_id`,
          [s.user_id, a.id],
        );
        if (marker.rows.length > 0) {
          dueSoonSent += 1;
          await addNotification(
            "user", s.user_id, "assignment.due.soon",
            "Assignment due soon",
            `${a.title} is due in about an hour. Don’t forget to submit.`,
          );
        }
      }
    }

    // ── 2. pending: assignments that passed due within PENDING_AFTER_MIN ──
    const { rows: overdue } = await query<{
      id: string; title: string; faculty_id: string;
    }>(
      `SELECT id::text, title, faculty_id::text
         FROM public.assignments
        WHERE due_at::timestamptz > $1::timestamptz
          AND due_at::timestamptz <= $2::timestamptz
          AND EXISTS (
            SELECT 1 FROM public.assignment_submissions s
             WHERE s.assignment_id = public.assignments.id::uuid AND s.status = 'PENDING'
          )`,
      [pendingCutoff, nowIso],
    );

    for (const a of overdue) {
      const { rows: [fac] } = await query<{ faculty_id: string }>(
        `SELECT faculty_id::text FROM public.assignments WHERE id = $1::uuid`,
        [a.id],
      );
      const facultyId = fac?.faculty_id;
      if (!facultyId) continue;
      const marker = await query(
        `INSERT INTO public.assignment_reminder_markers (user_id, assignment_id, kind)
         VALUES ($1::uuid, $2::uuid, 'pending')
         ON CONFLICT (user_id, assignment_id, kind) DO NOTHING
         RETURNING user_id`,
        [facultyId, a.id],
      );
      if (marker.rows.length > 0) {
        pendingSent += 1;
        await addNotification(
          "user", facultyId, "assignment.pending",
          "Review outstanding assignments",
          `${a.title} is past due — confirm who has and has not submitted.`,
        );
      }
    }

    return NextResponse.json({
      ok: true,
      dueSoonSent,
      pendingSent,
      nowIso,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 500 });
  }
}
