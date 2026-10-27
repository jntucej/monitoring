import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";

const IN_CHARGE = new Set(["mess_incharge", "admin", "sysadmin"]);

function getEventId(req: NextRequest): string {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("counts");
  return idx > 1 ? parts[idx - 2] : "";
}

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!IN_CHARGE.has(auth.role)) return fail("FORBIDDEN", "Not allowed", 403);
  const eventId = getEventId(req);
  if (!eventId) return fail("VALIDATION_ERROR", "Missing event id", 400);

  const { rows: items } = await query<{
    id: string; code: string; label: string; category: string;
    is_primary: boolean; sort_order: number; count: number;
  }>(
    `SELECT i.id, i.code, i.label, i.category, i.is_primary, i.sort_order,
            COALESCE(c.count, 0)::int AS count
       FROM public.mess_special_items i
       LEFT JOIN (
         SELECT item_id, COUNT(*)::int AS count
           FROM public.mess_special_interests WHERE event_id = $1
          GROUP BY item_id
       ) c ON c.item_id = i.id
      WHERE i.event_id = $1 AND i.is_active
      ORDER BY i.sort_order, i.label`,
    [eventId],
  );

  const { rows: students } = await query<{
    user_id: string; name: string; unique_id: string; item_ids: string[];
  }>(
    `SELECT i.user_id, u.name, u.unique_id,
            array_agg(i.item_id) AS item_ids
       FROM public.mess_special_interests i
       JOIN public.users u ON u.id = i.user_id
      WHERE i.event_id = $1
      GROUP BY i.user_id, u.name, u.unique_id
      ORDER BY u.name`,
    [eventId],
  );

  return ok({
    eventId,
    items: items.map((r) => ({
      id: r.id, code: r.code, label: r.label, category: r.category,
      isPrimary: r.is_primary, sortOrder: r.sort_order, count: Number(r.count),
    })),
    students: students.map((s) => ({
      userId: s.user_id, name: s.name, uniqueId: s.unique_id, itemIds: s.item_ids,
    })),
  });
}

export const GET = withAuthorization(
  withRateLimit(handleGet, { windowMs: 60_000, maxRequests: 120 }),
  {},
);
