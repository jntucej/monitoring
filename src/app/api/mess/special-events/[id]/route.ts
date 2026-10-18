import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query, withTransaction } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import { SPECIAL_CATEGORIES, type SpecialItemCategory } from "@/lib/mess-reviews";

const IN_CHARGE = new Set(["mess_incharge", "admin", "sysadmin"]);
const CAT_SET = new Set(SPECIAL_CATEGORIES.map((c) => c.value));

function getEventId(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

async function handlePatch(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!IN_CHARGE.has(auth.role)) return fail("FORBIDDEN", "Not allowed", 403);
  const eventId = getEventId(req);
  if (!eventId) return fail("VALIDATION_ERROR", "Missing event id", 400);

  const body = (await req.json().catch(() => null)) as
    | {
        status?: unknown; notes?: unknown;
        announcementAt?: unknown; interestDeadline?: unknown;
        servingStartAt?: unknown; servingEndAt?: unknown;
        hostelOnly?: unknown;
        items?: unknown;
      }
    | null;

  const { rows: existing } = await query<{
    id: string; status: string; announcement_at: string; event_date: string;
  }>(
    `SELECT id, status, announcement_at, event_date::text FROM public.mess_special_events WHERE id = $1`,
    [eventId],
  );
  if (existing.length === 0) return fail("NOT_FOUND", "Event not found", 404);

  const patch: string[] = [];
  const params: unknown[] = [];
  const add = (col: string, val: unknown) => {
    params.push(val);
    patch.push(`${col} = $${params.length}`);
  };

  if (body?.notes !== undefined) add("notes", body.notes == null ? null : String(body.notes).slice(0, 500));
  if (body?.announcementAt !== undefined) add("announcement_at", new Date(String(body.announcementAt)).toISOString());
  if (body?.interestDeadline !== undefined) add("interest_deadline", new Date(String(body.interestDeadline)).toISOString());
  if (body?.servingStartAt !== undefined) add("serving_start_at", new Date(String(body.servingStartAt)).toISOString());
  if (body?.servingEndAt !== undefined) add("serving_end_at", new Date(String(body.servingEndAt)).toISOString());
  if (body?.hostelOnly !== undefined) add("hostel_only", Boolean(body.hostelOnly));
  if (body?.status !== undefined) {
    const s = String(body.status).toUpperCase();
    if (!["SCHEDULED", "CLOSED", "CANCELLED"].includes(s))
      return fail("VALIDATION_ERROR", "Invalid status", 400);
    add("status", s);
  }

  const replaceItems = Array.isArray(body?.items);
  if (replaceItems) {
    // Only allow item replacement before the announcement goes live and if
    // there are no interests yet — deleting items cascades into interests.
    if (new Date(existing[0].announcement_at).getTime() <= Date.now())
      return fail("CONFLICT", "Cannot change items after the event is announced", 409);
    const { rows: interestRows } = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM public.mess_special_interests WHERE event_id = $1`,
      [eventId],
    );
    if ((interestRows[0]?.count ?? 0) > 0)
      return fail("CONFLICT", "Cannot change items once students have registered interest", 409);
  }

  await withTransaction(async (client) => {
    if (patch.length > 0) {
      params.push(eventId);
      await client.query(
        `UPDATE public.mess_special_events SET ${patch.join(", ")}, updated_at = NOW()
          WHERE id = $${params.length}`,
        params,
      );
    }
    if (replaceItems) {
      const itemsIn = (body as { items: unknown }).items as Record<string, unknown>[];
      await client.query(`DELETE FROM public.mess_special_items WHERE event_id = $1`, [eventId]);
      for (let i = 0; i < itemsIn.length; i++) {
        const raw = itemsIn[i];
        const code = String(raw?.code ?? "").trim().toUpperCase().slice(0, 20);
        const label = String(raw?.label ?? "").trim().slice(0, 80);
        const category = String(raw?.category ?? "VEG").toUpperCase() as SpecialItemCategory;
        if (!code || !label || !CAT_SET.has(category)) continue;
        await client.query(
          `INSERT INTO public.mess_special_items
             (event_id, code, label, category, is_primary, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [eventId, code, label, category, Boolean(raw?.isPrimary), i],
        );
      }
    }
  });

  const action = body?.status === "CANCELLED"
    ? "MESS_SPECIAL_EVENT_CANCELLED"
    : body?.status === "CLOSED"
      ? "MESS_SPECIAL_EVENT_CLOSED"
      : "MESS_SPECIAL_EVENT_UPDATED";
  await addAudit({ action, userId: auth.userId, role: auth.role, details: { eventId } });
  return ok({ updated: true });
}

export const PATCH = withAuthorization(
  withRateLimit(handlePatch, { windowMs: 60_000, maxRequests: 60 }),
  {},
);
