import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";

/**
 * POST /api/cron/mess-reminder
 *
 * Finds eligible hostellers without a selection for active mess days whose
 * window is open, and logs a REMINDER notification event per student.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: { message: "CRON_SECRET is not configured on server" } },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-cron-secret");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (secretHeader !== cronSecret && bearerToken !== cronSecret) {
    return NextResponse.json(
      { success: false, error: { message: "Unauthorized cron request" } },
      { status: 401 }
    );
  }

  try {
    const openDays = await query(
      `SELECT id, meal_date, window_opens_at, window_closes_at
         FROM mess_days
        WHERE is_active = TRUE
          AND tokens_locked_at IS NULL
          AND window_opens_at IS NOT NULL
          AND NOW() >= window_opens_at
          AND NOW() <= window_closes_at`
    );

    let totalReminded = 0;
    const perDay: Array<{ dayId: string; mealDate: string; reminded: number }> = [];

    for (const day of openDays.rows as any[]) {
      const pendingRes = await query(
        `SELECT u.id, u.unique_id AS roll
           FROM users u
           JOIN student_details sd ON sd.user_id::text = u.id::text
          WHERE u.role = 'student'
            AND sd.hostel_block IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM mess_preferences p
               WHERE p.user_id::text = u.id::text AND p.mess_day_id::text = $1
            )`,
        [day.id]
      );

      for (const r of pendingRes.rows as any[]) {
        await query(
          `INSERT INTO mess_notifications_log
             (user_id, mess_day_id, event_type, channel, status, payload, sent_at)
           VALUES ($1::uuid, $2::uuid, 'REMINDER', 'push', 'SENT',
                   jsonb_build_object('mealDate', $3::text, 'roll', $4::text),
                   NOW())`,
          [r.id, day.id, day.meal_date, r.roll ?? ""]
        );
        totalReminded += 1;
      }

      perDay.push({ dayId: day.id, mealDate: day.meal_date, reminded: pendingRes.rows.length });
    }

    if (totalReminded > 0) {
      await addAudit({
        action: "MESS_REMINDER",
        userId: "system-cron",
        userName: "Cron Scheduler",
        role: "sysadmin",
        details: { totalReminded, perDay },
      });
    }

    return NextResponse.json({
      success: true,
      data: { executedAt: new Date().toISOString(), days: perDay.length, totalReminded },
    });
  } catch (err: any) {
    console.error("[cron/mess-reminder]", err);
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
