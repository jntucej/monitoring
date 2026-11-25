import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const sessionIdParam = req.nextUrl.searchParams.get("session_id");

  const { rows: sessionRows } = await query<{
    id: string;
    meal_date: string;
    meal_type: string;
    window_opens_at: string;
    window_closes_at: string;
    is_active: boolean;
  }>(
    sessionIdParam
      ? `SELECT id, meal_date::text, meal_type, window_opens_at, window_closes_at, is_active
           FROM public.mess_days WHERE id = $1::uuid LIMIT 1`
      : `SELECT id, meal_date::text, meal_type, window_opens_at, window_closes_at, is_active
           FROM public.mess_days
          WHERE is_active = true
          ORDER BY window_opens_at DESC LIMIT 1`,
    sessionIdParam ? [sessionIdParam] : [],
  );
  const session = sessionRows[0];
  if (!session) return fail("NO_SESSION", "No meal session found", 404);

  // Caretaker is strictly block-scoped
  let caretakerBlock: string | null = null;
  if (auth.role === "caretaker") {
    const { rows: uRows } = await query<{ hostel_block: string | null; assigned_hostel: string | null }>(
      `SELECT hostel_block, assigned_hostel FROM public.users WHERE id = $1::uuid LIMIT 1`,
      [auth.userId],
    );
    caretakerBlock = uRows[0]?.hostel_block ?? uRows[0]?.assigned_hostel ?? null;
    if (!caretakerBlock) {
      return fail("NO_BLOCK_ASSIGNED", "Caretaker has no assigned hostel block", 403);
    }
  }

  const { rows: counters } = await query(
    `SELECT c.id, c.name, c.block_id,
            COALESCE(sc.served, 0) AS served,
            sc.capacity
       FROM public.mess_counters c
       LEFT JOIN public.mess_session_counters sc
         ON sc.counter_id = c.id AND sc.session_id = $1::uuid
      WHERE c.active = true
        AND ($2::text IS NULL OR c.block_id IS NULL OR c.block_id = $2)
      ORDER BY c.name ASC`,
    [session.id, caretakerBlock],
  );

  const { rows: specials } = await query(
    `SELECT s.*, c.name AS counter_name
       FROM public.mess_special_schedules s
       JOIN public.mess_counters c ON c.id = s.counter_id
      WHERE s.session_id = $1::uuid
      ORDER BY s.created_at DESC`,
    [session.id],
  );

  const { rows: anomalies } = await query(
    `SELECT e.id, e.student_id, u.unique_id AS roll_no, u.name AS student_name,
            u.hostel_block, e.counter_id, e.outcome, e.reason_text, e.scanned_at
       FROM public.mess_scan_events e
       JOIN public.users u ON u.id = e.student_id
      WHERE e.session_id = $1::uuid
        AND e.outcome <> 'ok'
        AND ($2::text IS NULL OR u.hostel_block = $2)
      ORDER BY e.scanned_at DESC
      LIMIT 30`,
    [session.id, caretakerBlock],
  );

  const { rows: expectedRows } = await query<{ cnt: string }>(
    caretakerBlock
      ? `SELECT COUNT(*)::text AS cnt FROM public.users
          WHERE role = 'student' AND deleted_at IS NULL AND hostel_block = $1`
      : `SELECT COUNT(*)::text AS cnt FROM public.mess_eligibility WHERE active = true`,
    caretakerBlock ? [caretakerBlock] : [],
  );

  const { rows: servedRows } = await query<{ cnt: string }>(
    caretakerBlock
      ? `SELECT COUNT(DISTINCT e.student_id)::text AS cnt
           FROM public.mess_scan_events e
           JOIN public.users u ON u.id = e.student_id
          WHERE e.session_id = $1::uuid AND e.outcome = 'ok' AND u.hostel_block = $2`
      : `SELECT COUNT(DISTINCT student_id)::text AS cnt
           FROM public.mess_scan_events
          WHERE session_id = $1::uuid AND outcome = 'ok'`,
    caretakerBlock ? [session.id, caretakerBlock] : [session.id],
  );

  return ok({
    session,
    block_scope: caretakerBlock,
    total_expected: parseInt(expectedRows[0]?.cnt ?? "0", 10),
    total_served: parseInt(servedRows[0]?.cnt ?? "0", 10),
    counters,
    specials,
    anomalies,
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["mess_incharge", "hostel_manager", "caretaker", "admin", "sysadmin"],
});
