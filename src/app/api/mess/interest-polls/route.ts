import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { publishNotification } from "@/lib/notifications/bus";

async function handleGet(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const { rows } = await query(
    status
      ? `SELECT p.*, c.name AS counter_name
           FROM public.mess_interest_polls p
           LEFT JOIN public.mess_counters c ON c.id = p.counter_id
          WHERE p.status = $1
          ORDER BY p.closes_at ASC`
      : `SELECT p.*, c.name AS counter_name
           FROM public.mess_interest_polls p
           LEFT JOIN public.mess_counters c ON c.id = p.counter_id
          ORDER BY p.opens_at DESC
          LIMIT 50`,
    status ? [status] : [],
  );
  return ok({ polls: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const body = await req.json().catch(() => null);
  const proposedItem = String(body?.proposed_item ?? "").trim();
  const mealType = String(body?.meal_type ?? "lunch").trim();
  const scheduledFor = body?.scheduled_for ? String(body.scheduled_for) : null;
  const counterId = body?.counter_id ? String(body.counter_id) : null;
  const targetScope = String(body?.target_scope ?? "mess").trim();
  const closesAt = String(body?.closes_at ?? "").trim();
  const participationMin = Number(body?.participation_min ?? 0.4);
  const approvalMin = Number(body?.approval_min ?? 0.6);

  if (!proposedItem || !closesAt) {
    return fail("INVALID_INPUT", "proposed_item and closes_at are required", 400);
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.mess_interest_polls
       (proposed_item, meal_type, scheduled_for, counter_id, target_scope, closes_at, participation_min, approval_min, created_by)
     VALUES ($1, $2, $3::date, $4::uuid, $5, $6::timestamptz, $7, $8, $9::uuid)
     RETURNING id`,
    [proposedItem, mealType, scheduledFor, counterId, targetScope, closesAt, participationMin, approvalMin, auth.userId],
  );

  await addAudit({
    action: "MESS_INTEREST_POLL_CREATED",
    userId: auth.userId,
    role: auth.role,
    details: { pollId: rows[0].id, proposedItem, mealType, closesAt },
  });

  await publishNotification({
    eventType: "mess.poll.opened",
    actorId: auth.userId,
    actorRole: auth.role,
    scope: targetScope,
    title: `New mess poll: ${proposedItem}`,
    message: `Vote YES / MAYBE / NO for ${proposedItem} (${mealType}).`,
    payload: { poll_id: rows[0].id, proposed_item: proposedItem, closes_at: closesAt },
    priority: "normal",
    channels: ["in_app"],
  }).catch(() => {});

  return ok({ id: rows[0].id, status: "open" }, 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "staff", "mess_incharge", "hostel_manager", "admin", "sysadmin"],
});

export const POST = withAuthorization(handlePost, {
  requiredRole: ["mess_incharge", "admin", "sysadmin"],
});
