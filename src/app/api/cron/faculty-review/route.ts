// /api/cron/faculty-review/route.ts
// Duty-off review agent: at duty-off (last class end + 30 min, fallback
// 18:30), send each faculty one card:
//   - today's class aggregate (present/absent per class)
//   - "Overall, how did today go?" — 3 inline buttons
//   - "Tomorrow: …" preview line (the retention lever)
//
// Triggers:
//   - one card per faculty per day
//   - none on days with no classes
//   - anomaly lead: if any class was <50% or unmarked, the card leads with that
//   - one next-morning reminder if unopened (max 3 then stop — the research
//     shows reminder ladders don't lift evaluation completion)
//
// Bounded to: faculty scope (acts as the faculty's own review channel).
// Writes audit_events with actor_type='agent'.

import { errMsg } from "@/lib/err-msg";
import { NextRequest } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query } from "@/lib/postgres";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const today = new Date().toISOString().slice(0, 10);

    // 1. Faculty who have classes today (or did)
    const { rows: facultyRows } = await query<{
      id: string;
      name: string;
      chat_id: number | null;
      duty_off_override: string | null;
    }>(
      `SELECT u.id, u.name, u.telegram_chat_id AS chat_id, u.duty_off_override
         FROM public.users u
        WHERE u.role IN ('faculty','staff') AND u.status = 'ACTIVE'
          AND u.telegram_chat_id IS NOT NULL`,
      [],
    );

    let cardsSent = 0;
    let anomalyCards = 0;
    for (const f of facultyRows) {
      if (!f.chat_id) continue;

      // 2. Their classes + attendance today
      const { rows: clsRows } = await query<{
        class_code: string;
        present: string;
        total: string;
      }>(
        `SELECT fa.subject_code AS class_code,
                COUNT(*) FILTER (WHERE ar.status = 'present')::text AS present,
                COUNT(*)::text AS total
           FROM public.faculty_assignments fa
           LEFT JOIN public.student_details sd
              ON sd.department = (SELECT c.department_id::text FROM public.classes c WHERE c.id = fa.class_id)
           LEFT JOIN public.attendance_records ar
              ON ar.person_id = sd.user_id AND ar.date = CURRENT_DATE
          WHERE fa.faculty_id = $1 AND fa.is_active
          GROUP BY fa.subject_code
          ORDER BY fa.subject_code`,
        [f.id],
      );

      if (!clsRows.length) continue; // no classes today → silence is correct

      // 3. Anomaly check: any class <50% or unmarked
      const anomaly = clsRows.find(
        (c) => c.total === "0" || (c.present !== "" && c.total !== "0" && Number(c.present) / Number(c.total) < 0.5),
      );

      // 4. Already reviewed today?
      const { rows: revRows } = await query<{ id: string }>(
        `SELECT id FROM public.class_reviews WHERE faculty_id = $1 AND session_date = $2`,
        [f.id, today],
      );
      if (revRows.length) continue; // already done

      // 5. Tomorrow preview
      const { rows: tmrRows } = await query<{ subject: string; start_time: string; hall: string }>(
        `SELECT fa.subject_code, to_char(cp.start_time, 'HH24:MI') AS start_time, cp.hall
           FROM public.faculty_assignments fa
           JOIN public.class_periods cp ON cp.class_id = fa.class_id
          WHERE fa.faculty_id = $1 AND fa.is_active
            AND cp.day_of_week = EXTRACT(DOW FROM (CURRENT_DATE + 1))::int + 1
          ORDER BY cp.start_time
          LIMIT 2`,
        [f.id],
      );
      const tomorrowLine = tmrRows.length
        ? `Tomorrow: ${tmrRows.map((t) => `${t.subject} ${t.start_time}${t.hall ? " (" + t.hall + ")" : ""}`).join(" · ")}`
        : "Tomorrow: no classes in timetable";

      const classLines = clsRows
        .map((c) => `${c.class_code} ${c.present}/${c.total}`)
        .join(" · ");

      const header =
        `Your day — ${new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ` +
        `${clsRows.length} classes`;

      const body =
        header + "\n" +
        (anomaly ? `⚠️ ${anomaly.class_code} ${anomaly.present}/${anomaly.total} — flag anything?\n` : "") +
        classLines + "\n\n" +
        "Overall, how did today go?\n" +
        `Goes to your HOD → Dean → Principal. You keep a copy. ${tomorrowLine}`;

      const replyMarkup = {
        inline_keyboard: [
          [
            { text: "✅ Good", callback_data: `rev:${f.id}:good` },
            { text: "⚠️ Needs attention", callback_data: `rev:${f.id}:attention` },
            { text: "📝 Add note", callback_data: `rev:${f.id}:note` },
          ],
        ],
      };

      const ok = await sendTelegramMessage(f.chat_id, body, {
        replyMarkup,
        parseMode: "Markdown",
      });
      if (ok) {
        cardsSent += 1;
        if (anomaly) anomalyCards += 1;
      }

      // 6. audit
      await query(
        `INSERT INTO public.audit_events
           (actor_id, actor_type, role_context, action, resource, after_state)
         VALUES ($1, 'agent', 'faculty', 'review_prompt_sent', 'class_reviews', $2)`,
        [f.id, JSON.stringify({ classes: clsRows.length, anomaly: !!anomaly })],
      ).catch(() => undefined);
    }

    return Response.json({
      success: true,
      cardsSent,
      anomalyCards,
      date: today,
    });
  } catch (err) {
    return Response.json({ success: false, error: errMsg(err) }, { status: 500 });
  }
}
