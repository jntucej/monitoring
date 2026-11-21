// src/lib/class-message-release.ts
// Shared release + fan-out routine for class_messages.
// One code path for BOTH release mechanisms:
//   - human tap-release: released_by = coordinator/author id, auto_released=FALSE
//   - cron auto-release: released_by = 'system-cron',      auto_released=TRUE
// The receipts + Telegram fan-out are identical in both cases.

import { query } from "@/lib/postgres";
import { sendTelegramMessage } from "@/lib/telegram";
import { logAuditEvent } from "@/lib/audit";

export interface ReleaseResult {
  released: boolean;
  studentsNotified: number;
}

/**
 * Release a single class message: mark released + fan out to all students
 * in its classes via Telegram + write receipt rows.
 *
 * @param messageId  the class_messages row
 * @param releasedBy user id for a human tap-release; "system-cron" for auto
 * @param source      "human" | "system" — recorded in audit (D-release-path)
 */
export async function releaseClassMessage(
  messageId: string,
  releasedBy: string,
  source: "human" | "system",
): Promise<ReleaseResult> {
  const { rows: msgs } = await query<{
    id: string;
    author_id: string;
    class_ids: string[];
    urgency: string;
    body: string;
    requires_ack: boolean;
    released_at: string | null;
  }>(
    `SELECT id, author_id, class_ids, urgency, body, requires_ack, released_at
       FROM public.class_messages WHERE id = $1::uuid`,
    [messageId],
  );
  if (msgs.length === 0) return { released: false, studentsNotified: 0 };
  const msg = msgs[0];
  if (msg.released_at) return { released: false, studentsNotified: 0 }; // already released

  const auto = source === "system";
  await query(
    `UPDATE public.class_messages
        SET released_at = NOW(), released_by = $1::uuid, auto_released = $2
      WHERE id = $3`,
    [auto ? msg.author_id : releasedBy, auto, messageId],
  );

  const { rows: authorRows } = await query<{ name: string }>(
    `SELECT name FROM public.users WHERE id = $1`, [msg.author_id],
  );
  const authorName = authorRows[0]?.name ?? "Faculty";

  const classIds: string[] = Array.isArray(msg.class_ids) ? msg.class_ids : [];
  let studentsNotified = 0;

  for (const classId of classIds) {
    const { rows: students } = await query<{ id: string; chat_id: number | null; roll: string }>(
      `SELECT u.id, u.telegram_chat_id AS chat_id, sd.roll
         FROM public.users u
         JOIN public.student_details sd ON sd.user_id = u.id
        WHERE u.department_id = (SELECT department_id FROM public.classes WHERE id = $1::uuid)
          AND u.role = 'student' AND u.status = 'ACTIVE'`,
      [classId],
    );
    for (const s of students) {
      if (!s.chat_id) continue;
      const suffix = auto ? "via auto-release" : "via coordinator tap-release";
      const msgText =
        `\u{1F4E2} Class notice - ${authorName}\n` +
        `${msg.body}\n` +
        `${suffix} - ${new Date().toLocaleString("en-GB")}` +
        (msg.requires_ack ? "\n[ Acknowledge ]" : "");
      const delivered = await sendTelegramMessage(s.chat_id, msgText, {
        parseMode: "Markdown",
        replyMarkup: msg.requires_ack
          ? {
              inline_keyboard: [
                [{ text: "Acknowledge", callback_data: `ack:${msg.id}:${s.id}` }],
              ],
            }
          : undefined,
      });
      await query(
        `INSERT INTO public.class_message_receipts (message_id, user_id, delivered_at, channel)
         VALUES ($1, $2, $3, 'telegram')
         ON CONFLICT (message_id, user_id) DO NOTHING`,
        [msg.id, s.id, delivered ? new Date().toISOString() : null],
      ).catch(() => undefined);
      if (delivered) studentsNotified += 1;
    }
  }

  await logAuditEvent({
    action: auto ? "class_message.auto_released" : "class_message.release",
    userId: auto ? "system-cron" : releasedBy,
    userName: "",
    userRole: auto ? "operator" : "coordinator",
    details: {
      targetId: msg.id,
      source,
      classes: classIds.length,
      urgency: msg.urgency,
      studentsNotified,
    },
  });

  return { released: true, studentsNotified };
}
