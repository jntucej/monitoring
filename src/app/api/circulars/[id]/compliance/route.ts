import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";

async function handleGet(req: NextRequest) {
  const parts = new URL(req.url).pathname.split("/");
  const circularId = parts[parts.length - 2];

  const { rows: cRows } = await query<{ feed_item_id: string | null; title: string }>(
    `SELECT feed_item_id, title FROM public.circular_requests WHERE id = $1::uuid LIMIT 1`,
    [circularId],
  );
  const circ = cRows[0];
  if (!circ) return fail("NOT_FOUND", "Circular not found", 404);
  if (!circ.feed_item_id) {
    return ok({ circular_id: circularId, title: circ.title, delivered: 0, viewed: 0, noted: 0, by_role: [] });
  }

  const { rows: totals } = await query<{ delivered: number; viewed: number; noted: number }>(
    `SELECT COUNT(*)::int AS delivered,
            COUNT(*) FILTER (WHERE seen_at IS NOT NULL)::int AS viewed,
            COUNT(*) FILTER (WHERE noted_at IS NOT NULL)::int AS noted
       FROM public.campus_feed_receipts
      WHERE feed_id = $1::uuid`,
    [circ.feed_item_id],
  );

  const { rows: byRole } = await query(
    `SELECT u.role,
            COUNT(*)::int AS delivered,
            COUNT(*) FILTER (WHERE r.seen_at IS NOT NULL)::int AS viewed,
            COUNT(*) FILTER (WHERE r.noted_at IS NOT NULL)::int AS noted
       FROM public.campus_feed_receipts r
       JOIN public.users u ON u.id = r.user_id
      WHERE r.feed_id = $1::uuid
      GROUP BY u.role
      ORDER BY u.role ASC`,
    [circ.feed_item_id],
  );

  return ok({
    circular_id: circularId,
    title: circ.title,
    ...(totals[0] ?? { delivered: 0, viewed: 0, noted: 0 }),
    by_role: byRole,
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["faculty", "hod", "hostel_manager", "vice_principal", "principal", "admin", "sysadmin"],
});
