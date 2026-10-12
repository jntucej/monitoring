import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";

/**
 * POST /api/cron/mess-no-show-check
 *
 * For today's meal day, flags students who declared will_be_present = TRUE
 * but have no mess_meal_served row. Logs NO_SHOW_FLAGGED events.
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
    const todayRes = await query(
      `SELECT id, meal_date
         FROM mess_days
        WHERE is_active = TRUE
          AND meal_date = CURRENT_DATE
        ORDER BY window_closes_at ASC
        LIMIT 1`
    );
    const day: any = todayRes.rows[0];
    if (!day) {
      return NextResponse.json({
        success: true,
        data: { executedAt: new Date().toISOString(), flagged: 0, reason: "NO_DAY_TODAY" },
      });
    }

    const flaggedRes = await query(
      `SELECT p.user_id, u.unique_id AS roll, u.name
         FROM mess_preferences p
         JOIN users u ON u.id::text = p.user_id::text
        WHERE p.mess_day_id::text = $1
          AND p.will_be_present = TRUE
          AND NOT EXISTS (
            SELECT 1 FROM mess_meal_served s
             WHERE s.mess_day_id::text = p.mess_day_id::text AND s.user_id::text = p.user_id::text
          )`,
      [day.id]
    );

    for (const r of flaggedRes.rows as any[]) {
      await query(
        `INSERT INTO mess_notifications_log
           (user_id, mess_day_id, event_type, channel, status, payload, sent_at)
         VALUES ($1::uuid, $2::uuid, 'NO_SHOW_FLAGGED', 'system', 'SENT',
                 jsonb_build_object('mealDate', $3::text, 'roll', $4::text, 'name', $5::text),
                 NOW())`,
        [r.user_id, day.id, day.meal_date, r.roll ?? "", r.name ?? ""]
      );
    }

    await addAudit({
      action: "MESS_NO_SHOW_FLAGGED",
      userId: "system-cron",
      userName: "Cron Scheduler",
      role: "sysadmin",
      details: {
        dayId: day.id,
        mealDate: day.meal_date,
        flagged: flaggedRes.rows.length,
        rolls: flaggedRes.rows.map((r: any) => r.roll),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        executedAt: new Date().toISOString(),
        dayId: day.id,
        mealDate: day.meal_date,
        flagged: flaggedRes.rows.length,
      },
    });
  } catch (err: any) {
    console.error("[cron/mess-no-show-check]", err);
    return NextResponse.json(
      { success: false, error: { message: err.message } },
      { status: 500 }
    );
  }
}
