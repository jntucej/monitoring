import { NextRequest, NextResponse } from "next/server";
import { query, addAudit } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { getDayById, getNextActiveDay } from "../_helpers";
import { TIER } from "@/server/policy/roles";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const dayIdParam = req.nextUrl.searchParams.get("dayId");
    const day = dayIdParam ? await getDayById(dayIdParam) : await getNextActiveDay();
    if (!day) return fail("DAY_NOT_FOUND", "Mess day not found", 404);

    const res = await query(
      `SELECT u.id AS userId,
              u.unique_id AS roll,
              u.name AS name,
              p.primary_item AS primaryItem,
              p.will_be_present AS willBePresent,
              s.id AS servedId,
              s.served_at AS servedAt,
              s.method AS servedMethod
         FROM users u
         LEFT JOIN mess_preferences p
           ON p.user_id::text = u.id::text AND p.mess_day_id::text = $1
         LEFT JOIN mess_meal_served s
           ON s.mess_day_id::text = $1 AND s.user_id::text = u.id::text
        WHERE u.role = 'student'
          AND (
            u.id::text IN (SELECT user_id::text FROM mess_preferences WHERE mess_day_id::text = $1)
            OR u.id::text IN (SELECT user_id::text FROM mess_tokens WHERE mess_day_id::text = $1)
            OR EXISTS (SELECT 1 FROM student_details sd WHERE sd.user_id::text = u.id::text AND sd.hostel_block IS NOT NULL)
          )
        ORDER BY u.name ASC`,
      [day.id, day.id]
    );

    const rows = res.rows.map((r: any) => ({
      userId: r.userId,
      roll: r.roll,
      name: r.name,
      primaryItem: r.primaryItem ?? null,
      confirmed: r.servedId != null,
      noShow: r.willBePresent === true && r.servedId == null,
      method: r.servedMethod ?? null,
      servedAt: r.servedAt ?? null,
    }));

    return ok({ messDayId: day.id, mealDate: day.meal_date, count: rows.length, arrivals: rows });
  } catch (err) {
    console.error("[mess/arrivals GET]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load arrivals" } },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  try {
    const body = await req.json().catch(() => null);
    const dayId: string = body?.dayId ?? "";

    // Bulk no-show flag: POST { dayId, flagNoShow: true }
    // Finds every eligible student for this day who said will_be_present=TRUE
    // but was never served, and writes a NO_SHOW notification log row.
    // No data is mutated on the preference/token rows themselves — this is
    // an audit/reporting action only, matching the cron no-show-check.
    if (body?.flagNoShow === true) {
      if (!dayId) return fail("MISSING_PARAM", "dayId is required", 400);
      const day = await getDayById(dayId);
      if (!day) return fail("DAY_NOT_FOUND", "Mess day not found", 404);

      const res = await query(
        `INSERT INTO mess_notifications_log (user_id, mess_day_id, event_type, channel, status, payload, sent_at)
         SELECT p.user_id, p.mess_day_id, 'NO_SHOW_FLAGGED', 'DASHBOARD', 'SENT',
                jsonb_build_object('dayId', p.mess_day_id::text, 'primaryItem', p.primary_item),
                NOW()
           FROM mess_preferences p
          WHERE p.mess_day_id::text = $1
            AND p.will_be_present = TRUE
            AND NOT EXISTS (
              SELECT 1 FROM mess_meal_served s
               WHERE s.mess_day_id::text = p.mess_day_id::text AND s.user_id::text = p.user_id::text
            )
            AND NOT EXISTS (
              SELECT 1 FROM mess_notifications_log n
               WHERE n.user_id::text = p.user_id::text
                 AND n.mess_day_id::text = p.mess_day_id::text
                 AND n.event_type = 'NO_SHOW_FLAGGED'
            )
         RETURNING user_id`,
        [dayId]
      );
      const flagged = res.rows.length;

      await addAudit({
        action: "MESS_NO_SHOW_FLAGGED",
        userId: auth.userId,
        role: auth.role,
        details: { dayId, flagged },
      });

      return ok({ dayId, flagged, message: `${flagged} student(s) flagged as no-show for this meal day.` });
    }

    // Single arrival confirm: POST { userId, dayId }
    const userId: string = body?.userId ?? "";
    if (!userId || !dayId) return fail("MISSING_PARAM", "userId and dayId are required", 400);

    const day = await getDayById(dayId);
    if (!day) return fail("DAY_NOT_FOUND", "Mess day not found", 404);

    const studentRes = await query(
      `SELECT id, unique_id AS roll, name FROM users WHERE id::text = $1 AND role = 'student'`,
      [userId]
    );
    const student: any = studentRes.rows[0];
    if (!student) return fail("STUDENT_NOT_FOUND", "Student not found", 404);

    const tokenRes = await query(
      `SELECT id FROM mess_tokens WHERE mess_day_id::text = $1 AND user_id::text = $2 LIMIT 1`,
      [dayId, userId]
    );
    const tokenId: string | null = tokenRes.rows[0]?.id ?? null;

    const exists = await query(
      `SELECT id FROM mess_meal_served WHERE user_id::text = $1 AND mess_day_id::text = $2`,
      [userId, dayId]
    );
    if (exists.rows.length > 0) {
      return fail("ALREADY_SERVED", "This student has already been served for this day", 409);
    }

    await query(
      `INSERT INTO mess_meal_served (user_id, mess_day_id, token_id, served_at, method, served_by)
       VALUES ($1::uuid, $2::uuid, $3::uuid, NOW(), 'MANUAL', $4::uuid)`,
      [userId, dayId, tokenId, auth.userId]
    );

    await addAudit({
      action: "MESS_ARRIVAL_CONFIRMED",
      userId: auth.userId,
      role: auth.role,
      details: { dayId, studentId: userId, roll: student.roll, servedBy: auth.userId },
    });

    return ok({ userId, messDayId: dayId, method: "MANUAL" });
  } catch (err) {
    console.error("[mess/arrivals POST]", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to confirm arrival" } },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(
  withAuthorization(async (req, ctx) => handleGet(req, ctx), { requiredRole: TIER.MESS_INCHARGE }),
  { keyPrefix: "mess_arrivals_get" }
);

export const POST = withRateLimit(
  withAuthorization(async (req, ctx) => handlePost(req, ctx), { requiredRole: TIER.MESS_INCHARGE }),
  { keyPrefix: "mess_arrivals_post", maxRequests: 60 }
);
