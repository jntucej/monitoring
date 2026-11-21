// /api/cron/class-confirmation-prompts
//
// POST — runs every 15 minutes (follows the existing cron route pattern).
// Handles the pre-class confirmation lifecycle in one pass:
//   1. Prompt — for each session starting in [60-75] minutes with no
//      confirmation record yet, emit `class.confirmation.requested` to the
//      assigned faculty (deduped by class_confirmation_markers).
//   2. NO_SHOW — for each session 30 minutes before start that is still
//      PENDING, flip it to NO_SHOW and alert the HOD.
//   3. Evidence — for each session that ENDED today and was CONFIRMED but has
//      no attendance record, alert the HOD ("expected but didn't happen").
//
// No new dashboards, no websockets — a cron + the existing in-app
// notification channel + the alerts table for HOD visibility.
//
// Idempotent: the marker table dedupes prompts; NO_SHOW flips are one-way
// (PENDING → NO_SHOW); the evidence check is time-bounded (today's ended
// sessions only).

import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query, addNotification } from "@/lib/db";
import { errMsg } from "@/lib/err-msg";
import { toISTDateForCron, classSessionsForDateAll, sessionIdFor } from "@/lib/class-session";

// Window constants (env-overridable for testing).
const PROMPT_AHEAD_MIN = Number(process.env.CLASS_CONFIRM_PROMPT_AHEAD_MIN ?? "60"); // prompt at T-60
const PROMPT_WINDOW_MIN = Number(process.env.CLASS_CONFIRM_WINDOW_MIN ?? "15"); // ...through T-45
const NO_SHOW_BEFORE_MIN = Number(process.env.CLASS_CONFIRM_NO_SHOW_MIN ?? "30"); // NO_SHOW at T-30

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const now = new Date();
    const nowIST = new Date(now.getTime() + 5.5 * 3_600_000).toISOString();
    const nowISTms = Date.parse(nowIST);
    const today = toISTDateForCron(now);
    const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0=Sun

    // All of today's sessions, each with its deterministic session id.
    const sessions = await classSessionsForDateAll(today);

    let prompted = 0;
    let noShow = 0;
    let evidenceAlerts = 0;

    for (const s of sessions) {
      if (!s.facultyId) continue; // unassigned sessions aren't confirmable
      const sessionId = sessionIdFor(s.classId, s.subjectCode, s.date, s.period);

      // ── 1. Prompt window: start in [PROMPT_AHEAD, PROMPT_AHEAD - WINDOW] ──
      const startMs = Date.parse(s.startAt);
      const minsToStart = (startMs - nowISTms) / 60_000;
      if (minsToStart <= PROMPT_AHEAD_MIN && minsToStart >= PROMPT_AHEAD_MIN - PROMPT_WINDOW_MIN) {
        // Already confirmed/substituted? skip.
        const { rows: conf } = await query<{ status: string }>(
          `SELECT status FROM public.class_confirmations WHERE session_id = $1 AND faculty_id = $2 LIMIT 1`,
          [sessionId, s.facultyId],
        );
        if (conf[0] && conf[0].status !== "PENDING") continue;

        // Dedupe: one prompt per (faculty, session).
        const marker = await query(
          `INSERT INTO public.class_confirmation_markers (user_id, session_id, class_id, period)
           VALUES ($1::uuid, $2, $3::uuid, $4)
           ON CONFLICT (user_id, session_id) DO NOTHING
           RETURNING user_id`,
          [s.facultyId, sessionId, s.classId, s.period],
        );
        if (marker.rows.length > 0) {
          prompted += 1;
          const { rows: cls } = await query<{ name: string; department_id: string; section: string; year: number }>(
            `SELECT name, department_id::text, section::text, year::int FROM public.classes WHERE id = $1::uuid LIMIT 1`,
            [s.classId],
          );
          const className = cls[0]?.name ?? s.classId;
          await addNotification(
            "user",
            s.facultyId,
            "class.confirmation.requested",
            "Confirm your class",
            `Confirm you will teach ${className}, Period ${s.period} at ${s.label}.`,
          );
        }
      }

      // ── 2. NO_SHOW: T-30 and still PENDING ────────────────────────────────
      if (minsToStart <= NO_SHOW_BEFORE_MIN && minsToStart > 0) {
        const { rows: conf } = await query<{ status: string }>(
          `SELECT status FROM public.class_confirmations WHERE session_id = $1 AND faculty_id = $2 LIMIT 1`,
          [sessionId, s.facultyId],
        );
        if (conf[0]?.status === "PENDING") {
          await query(
            `UPDATE public.class_confirmations SET status = 'NO_SHOW', updated_at = NOW()
              WHERE session_id = $1 AND faculty_id = $2 AND status = 'PENDING'`,
            [sessionId, s.facultyId],
          );
          noShow += 1;
          // resource_id is a uuid column — the session id is a 32-char hash, so
          // it goes in detail; resource_id stays null.
          await query(
            `INSERT INTO public.alerts (severity, resource_type, resource_id, title, detail, created_by)
             VALUES ('medium', 'class_confirmation', NULL, $1, $2, NULL)`,
            [
              `Class ${s.label} not confirmed by T-${NO_SHOW_BEFORE_MIN} — HOD review`,
              `Faculty ${s.facultyId} (session ${sessionId}) has not confirmed; substitution may be needed.`,
            ],
          ).catch(() => undefined);
        }
      }

      // ── 3. Evidence: ended today, CONFIRMED, but no attendance recorded ───
      if (s.endAt <= nowIST && s.endAt >= new Date(nowISTms - 86_400_000).toISOString()) {
        const { rows: conf } = await query<{ status: string }>(
          `SELECT status FROM public.class_confirmations WHERE session_id = $1 AND faculty_id = $2 LIMIT 1`,
          [sessionId, s.facultyId],
        );
        if (conf[0]?.status === "CONFIRMED") {
          // Attendance is the real proof. Class attendance is keyed by
          // (person_id, date) — not per session — so the honest check is:
          // did ANY of this class's students record attendance today?
          const { rows: cls } = await query<{ section: string; year: number; department_id: string }>(
            `SELECT section::text, year::int, department_id::text FROM public.classes WHERE id = $1::uuid LIMIT 1`,
            [s.classId],
          );
          const meta = cls[0];
          let attCount = 0;
          if (meta) {
            const att = await query<{ n: string }>(
              `SELECT count(*)::text AS n
                 FROM public.attendance_records ar
                WHERE ar.date = CURRENT_DATE
                  AND ar.person_id IN (
                    SELECT sd.user_id FROM public.student_details sd
                     WHERE sd.section::text = $1 AND sd.year = $2 AND sd.branch::text = $3
                  )`,
              [meta.section, meta.year, meta.department_id],
            );
            attCount = Number(att.rows[0]?.n ?? "0");
          }
          if (attCount === 0) {
            evidenceAlerts += 1;
            await query(
              `INSERT INTO public.alerts (severity, resource_type, resource_id, title, detail, created_by)
               VALUES ('high', 'class_confirmation', NULL, $1, $2, NULL)`,
              [
                `Confirmed class ${s.label} had no attendance recorded today`,
                `Session ${sessionId} was CONFIRMED but no student attendance was logged today — the class may not have happened.`,
              ],
            ).catch(() => undefined);
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      prompted,
      noShow,
      evidenceAlerts,
      scannedSessions: sessions.length,
      weekday: dow,
      date: today,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: errMsg(e) }, { status: 500 });
  }
}
