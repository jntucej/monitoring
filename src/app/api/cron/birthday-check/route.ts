// /api/cron/birthday-check/route.ts
// Daily birthday sweep: finds ACTIVE users whose dob month-day equals
// today, inserts an in-app "Happy Birthday" notification for each
// (once per calendar year, tracked in birthday_celebrated), and —
// when the user has a linked Telegram account — posts the same
// message from the bot.
//
// Cron: daily 00:30 (x-cron-secret).

import { errMsg } from "@/lib/err-msg";
import { NextRequest } from "next/server";
import { requireCronAuth } from "@/server/http/cron-auth";
import { query } from "@/lib/postgres";

export async function POST(req: NextRequest) {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const now = new Date();
    const monthDay = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const year = now.getFullYear();

    // Users whose birthday is today and have not been celebrated this year.
    const { rows: bdayUsers } = await query<{
      id: string;
      name: string;
      unique_id: string | null;
      role: string;
    }>(
      `SELECT u.id, u.name, u.unique_id, u.role
         FROM public.users u
        WHERE u.status = 'ACTIVE'
          AND u.dob IS NOT NULL
          AND to_char(u.dob, 'MM-DD') = $1
          AND NOT EXISTS (
            SELECT 1 FROM public.birthday_celebrated bc
             WHERE bc.user_id = u.id AND bc.year = $2
          )`,
      [monthDay, year],
    );

    let notified = 0;
    let botSent = 0;
    const skipped: string[] = [];

    for (const u of bdayUsers) {
      // 1. In-app notification (the "for him only" part: recipient is
      //    the user themselves, not a role/broadcast).
      const ins = await query<{ id: string }>(
        `INSERT INTO public.notifications
           (type, priority, title, message, recipient_id, recipient_type, channels, data)
         VALUES
           ('birthday', 'low',
            '🎂 Happy Birthday, ${u.name}!',
            'Wishing you a wonderful birthday and a great year ahead. — JNTUH CEJ',
            $1, 'person', ARRAY['in_app'], $2)
         RETURNING id`,
        [u.id, JSON.stringify({ birthday: true, year, dobMonthDay: monthDay })],
      );
      // Record the celebration (once per year).
      await query(
        `INSERT INTO public.birthday_celebrated (user_id, year) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [u.id, year],
      );
      if (ins.rows.length > 0) notified += 1;

      // 2. Telegram bot message (only for users with a linked bot account).
      const link = await query<{ telegram_chat_id: number | null }>(
        `SELECT telegram_chat_id FROM public.telegram_user_profiles
          WHERE user_id = $1 AND telegram_chat_id IS NOT NULL
          ORDER BY created_at DESC LIMIT 1`,
        [u.id],
      );
      if (link.rows.length > 0 && link.rows[0].telegram_chat_id) {
        const sent = await sendBirthdayTelegram(link.rows[0].telegram_chat_id, u.name);
        if (sent) botSent += 1;
      }
    }

    return Response.json({
      success: true,
      date: monthDay,
      year,
      birthdaysToday: bdayUsers.length,
      inAppNotified: notified,
      botMessages: botSent,
      skipped,
    });
  } catch (err) {
    return Response.json({ success: false, error: errMsg(err) }, { status: 500 });
  }
}

/** Best-effort Telegram birthday message. Never blocks the sweep. */
async function sendBirthdayTelegram(chatId: number, name: string): Promise<boolean> {
  try {
    const { sendTelegramMessage } = await import("@/lib/telegram");
    await sendTelegramMessage(
      chatId,
      `🎂 *Happy Birthday, ${name}!*

Wishing you a wonderful year ahead.\n— JNTUH CEJ Campus Portal`,
    );
    return true;
  } catch {
    return false;
  }
}
