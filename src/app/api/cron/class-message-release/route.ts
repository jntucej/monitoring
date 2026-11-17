// /api/cron/class-message-release/route.ts
// Class-message relay fan-out: for each unreleased class_message in relay
// mode whose auto_release_at has passed, the agent:
//   1. marks released_by = system (auto-released)
//   2. fans out to all students in the message's class_ids
//   3. creates receipt rows
//   4. writes audit_events
//
// Also: for relay messages where a CR/ICR tapped "Release", the webhook
// handler calls the release endpoint directly (not via cron).
//
// Bounded to: operator scope (delivery infrastructure).
// Runs every 5 minutes.

import { errMsg } from "@/lib/err-msg";
import { NextRequest } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query } from "@/lib/postgres";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    // Find auto-release-due relay messages
    const { rows: dueMsgs } = await query<{
      id: string;
      author_id: string;
      class_ids: string[];
      urgency: string;
      body: string;
      requires_ack: boolean;
      auto_release_at: string;
    }>(
      `SELECT id, author_id, class_ids, urgency, body, requires_ack, auto_release_at
         FROM public.class_messages
        WHERE mode = 'relay'
          AND released_at IS NULL
          AND auto_release_at IS NOT NULL
          AND auto_release_at <= now()
        ORDER BY auto_release_at ASC
        LIMIT 50`,
      [],
    );

    let released = 0;
    let studentsNotified = 0;
    for (const msg of dueMsgs) {
      // 1. Mark auto-released
      await query(
        `UPDATE public.class_messages
            SET released_at = now(), released_by = author_id, auto_released = TRUE
          WHERE id = $1`,
        [msg.id],
      );

      // 2. Get the author's name
      const { rows: authorRows } = await query<{ name: string }>(
        `SELECT name FROM public.users WHERE id = $1`,
        [msg.author_id],
      );
      const authorName = authorRows[0]?.name ?? "Faculty";

      // 3. Fan out to students in the message's classes
      const classIds: string[] = Array.isArray(msg.class_ids) ? msg.class_ids : [];
      for (const classId of classIds) {
        const { rows: students } = await query<{ id: string; name: string; chat_id: number | null; roll: string }>(
          `SELECT u.id, u.name, u.telegram_chat_id AS chat_id, sd.roll
             FROM public.users u
             JOIN public.student_details sd ON sd.user_id = u.id
            WHERE u.department_id = (SELECT department_id FROM public.classes WHERE id = $1)
              AND u.role = 'student' AND u.status = 'ACTIVE'`,
          [classId],
        );
        for (const s of students) {
          if (!s.chat_id) continue;
          const msgText =
            `\u{1F4E2} ${classId} - ${authorName}\n` +
            `${msg.body}\n` +
            `via auto-release - ${new Date().toLocaleString("en-GB")}` +
            (msg.requires_ack ? "\n[ Acknowledge ]" : "");
          const ok = await sendTelegramMessage(s.chat_id, msgText, {
            parseMode: "Markdown",
            replyMarkup: msg.requires_ack
              ? {
                  inline_keyboard: [
                    [
                      { text: "Acknowledge", callback_data: `ack:${msg.id}:${s.id}` },
                    ],
                  ],
                }
              : undefined,
          });
          // 4. Receipt row
          await query(
            `INSERT INTO public.class_message_receipts (message_id, user_id, delivered_at, channel)
             VALUES ($1, $2, $3, 'telegram')
             ON CONFLICT (message_id, user_id) DO NOTHING`,
            [msg.id, s.id, ok ? new Date().toISOString() : null],
          ).catch(() => undefined);
          if (ok) studentsNotified += 1;
        }
      }

      // 5. audit
      await query(
        `INSERT INTO public.audit_events
           (actor_id, actor_type, role_context, action, resource, resource_id, after_state)
         VALUES ($1, 'agent', 'operator', 'class_message_auto_released', 'class_messages', $2, $3)`,
        ["system-cron", msg.id, JSON.stringify({ classes: classIds.length, urgency: msg.urgency })],
      ).catch(() => undefined);

      released += 1;
    }

    return Response.json({
      success: true,
      released,
      studentsNotified,
    });
  } catch (err) {
    return Response.json({ success: false, error: errMsg(err) }, { status: 500 });
  }
}
