// /api/cron/register-open/route.ts
// Timetable clock: at each period start, auto-open the register for the
// 4 authorized takers (CR-boy/girl, ICR-boy/girl) of that class/period.
//
// The bot messages the takers: "P3 CSE301 started 10:00 — [ Take attendance ]"
// One tap opens the gray→green keyboard. No one has to remember.
//
// Bounded to: operator scope (it's a gate-adjacent clock job).
// Writes audit_events with actor_type='agent'.
//
// Runs every 5 minutes; only fires when a period actually just started.

import { errMsg } from "@/lib/err-msg";
import { NextRequest } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query } from "@/lib/postgres";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const nowH = new Date().getHours();
    const nowM = new Date().getMinutes();
    const dayOfWeek = (new Date().getDay() + 1) % 7; // Mon=1 … Sun=7

    // Find periods that just started (within the last 10 minutes)
    const { rows: periods } = await query<{
      period_no: number;
      start_h: string;
      class_name: string;
      class_id: string;
      faculty_name: string;
      faculty_id: string;
    }>(
      `SELECT cp.period_no::text, to_char(cp.start_time, 'HH24:MI') AS start_h,
              c.name AS class_name, c.id AS class_id,
              f.name AS faculty_name, f.id AS faculty_id
         FROM public.class_periods cp
         JOIN public.classes c ON c.id = cp.class_id
         LEFT JOIN public.users f ON f.id = cp.faculty_id
        WHERE cp.day_of_week = $1
          AND to_char(cp.start_time, 'HH24') = to_char($2, 'HH24')
          AND (
            to_char(cp.start_time, 'HH24MI') <= to_char($2, 'HH24MI')
            AND to_char(cp.start_time, 'HH24MI') >=
                to_char($2 - INTERVAL '15 minutes', 'HH24MI')
          )`,
      [dayOfWeek, new Date()],
    );

    let opened = 0;
    for (const p of periods) {
      // Find authorized takers: CR/ICR students assigned to this class
      const { rows: takers } = await query<{ id: string; name: string; chat_id: number | null }>(
        `SELECT u.id, u.name, u.telegram_chat_id AS chat_id
           FROM public.users u
          WHERE u.is_cr = TRUE OR u.is_icr = TRUE
            AND u.role = 'student' AND u.status = 'ACTIVE'
            AND u.department_id = (SELECT c.department_id FROM public.classes c WHERE c.id = $1)
          LIMIT 8`,
        [p.class_id],
      );

      for (const t of takers) {
        if (!t.chat_id) continue;
        const msg =
          `📋 *${p.class_name} · P${p.period_no} started ${nowH}:${nowM}*\n` +
          `Class by ${p.faculty_name || "unassigned"}\n` +
          `[ Take attendance ] — /register`;
        const ok = await sendTelegramMessage(t.chat_id, msg, {
          replyMarkup: {
            inline_keyboard: [
              [
                {
                  text: "📋 Take attendance",
                  url: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME ?? "cej_server_bot"}?start=reg`,
                },
              ],
            ],
          },
          parseMode: "Markdown",
        });
        if (ok) opened += 1;
      }

      // audit
      await query(
        `INSERT INTO public.audit_events
           (actor_id, actor_type, role_context, action, resource, after_state)
         VALUES ($1, 'agent', 'operator', 'register_auto_open', 'class_periods', $2)`,
        ["system-cron", JSON.stringify({ class: p.class_name, period: p.period_no, takers: takers.length })],
      ).catch(() => undefined);
    }

    return Response.json({
      success: true,
      periodsChecked: periods.length,
      takersNotified: opened,
    });
  } catch (err) {
    return Response.json({ success: false, error: errMsg(err) }, { status: 500 });
  }
}
