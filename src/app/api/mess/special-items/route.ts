import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { publishNotification } from "@/lib/notifications/bus";

async function handleGet(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  const { rows } = await query(
    sessionId
      ? `SELECT s.*, c.name AS counter_name, d.meal_date::text, d.meal_type
           FROM public.mess_special_schedules s
           JOIN public.mess_counters c ON c.id = s.counter_id
           JOIN public.mess_days d ON d.id = s.session_id
          WHERE s.session_id = $1::uuid
          ORDER BY s.created_at DESC`
      : `SELECT s.*, c.name AS counter_name, d.meal_date::text, d.meal_type
           FROM public.mess_special_schedules s
           JOIN public.mess_counters c ON c.id = s.counter_id
           JOIN public.mess_days d ON d.id = s.session_id
          ORDER BY d.meal_date DESC, s.created_at DESC
          LIMIT 50`,
    sessionId ? [sessionId] : [],
  );
  return ok({ items: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const body = await req.json().catch(() => null);
  const sessionId = String(body?.session_id ?? "").trim();
  const counterId = String(body?.counter_id ?? "").trim();
  const itemName = String(body?.item_name ?? "").trim();
  const expectedCount = Number(body?.expected_count ?? 0);
  const lowThreshold = Number(body?.low_threshold ?? 0.2);

  if (!sessionId || !counterId || !itemName || !Number.isInteger(expectedCount) || expectedCount <= 0) {
    return fail("INVALID_INPUT", "session_id, counter_id, item_name, and positive expected_count are required", 400);
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.mess_special_schedules
       (session_id, counter_id, item_name, expected_count, low_threshold, status, created_by)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, 'planned', $6::uuid)
     RETURNING id`,
    [sessionId, counterId, itemName, expectedCount, lowThreshold, auth.userId],
  );

  await addAudit({
    action: "MESS_SPECIAL_SCHEDULED",
    userId: auth.userId,
    role: auth.role,
    details: { scheduleId: rows[0].id, sessionId, counterId, itemName, expectedCount },
  });

  await publishNotification({
    eventType: "mess.special.scheduled",
    actorId: auth.userId,
    actorRole: auth.role,
    scope: "mess",
    title: `Special item scheduled: ${itemName}`,
    message: `${itemName} (${expectedCount} portions) scheduled.`,
    payload: { schedule_id: rows[0].id, session_id: sessionId, counter_id: counterId, item_name: itemName, expected_count: expectedCount },
    priority: "normal",
    channels: ["in_app"],
  }).catch(() => {});

  return ok({ id: rows[0].id, status: "planned" }, 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["mess_incharge", "caretaker", "hostel_manager", "admin", "sysadmin"],
});

export const POST = withAuthorization(handlePost, {
  requiredRole: ["mess_incharge", "admin", "sysadmin"],
});
