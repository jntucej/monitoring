import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query, withTransaction } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";

function getEventId(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("interests");
  return idx > 0 ? parts[idx - 1] : "";
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (auth.role !== "student")
    return fail("FORBIDDEN", "Only students can register interest", 403);
  const eventId = getEventId(req);
  if (!eventId) return fail("VALIDATION_ERROR", "Missing event id", 400);
  const body = (await req.json().catch(() => null)) as { itemIds?: unknown } | null;
  const itemIdsRaw: unknown[] = Array.isArray(body?.itemIds) ? (body as { itemIds: unknown[] }).itemIds : [];
  const itemIds = Array.from(new Set(itemIdsRaw.map((x: unknown) => String(x))));
  if (itemIds.length > 20) return fail("VALIDATION_ERROR", "Too many items", 400);

  const { rows: evRows } = await query<{
    id: string; status: string; announcement_at: string; interest_deadline: string;
  }>(
    `SELECT id, status, announcement_at, interest_deadline
       FROM public.mess_special_events WHERE id = $1`,
    [eventId],
  );
  if (evRows.length === 0) return fail("NOT_FOUND", "Event not found", 404);
  const ev = evRows[0];
  if (ev.status === "CANCELLED") return fail("CONFLICT", "Event cancelled", 409);
  if (ev.status === "CLOSED") return fail("CONFLICT", "Event closed", 409);
  const now = Date.now();
  if (now < new Date(ev.announcement_at).getTime())
    return fail("CONFLICT", "Event not announced yet", 409);
  if (now > new Date(ev.interest_deadline).getTime())
    return fail("CONFLICT", "Interest deadline has passed", 409);

  if (itemIds.length > 0) {
    const { rows: valid } = await query<{ id: string }>(
      `SELECT id FROM public.mess_special_items
        WHERE event_id = $1 AND is_active AND id = ANY($2::uuid[])`,
      [eventId, itemIds],
    );
    if (valid.length !== itemIds.length)
      return fail("VALIDATION_ERROR", "One or more items are invalid for this event", 400);
  }

  await withTransaction(async (client) => {
    await client.query(
      `DELETE FROM public.mess_special_interests WHERE event_id = $1 AND user_id = $2`,
      [eventId, auth.userId],
    );
    for (const itemId of itemIds) {
      await client.query(
        `INSERT INTO public.mess_special_interests (event_id, item_id, user_id)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [eventId, itemId, auth.userId],
      );
    }
  });

  await addAudit({
    action: "MESS_SPECIAL_INTEREST_SAVED",
    userId: auth.userId,
    role: auth.role,
    details: { eventId, itemCount: itemIds.length },
  });
  return ok({ eventId, itemIds });
}

export const POST = withAuthorization(
  withRateLimit(handlePost, { windowMs: 60_000, maxRequests: 60 }),
  {},
);
