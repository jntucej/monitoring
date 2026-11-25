import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

/**
 * GET /api/caretaker/mess?block_id=&session_id=
 * Block-scoped lens for caretaker: 403 if block_id != caretaker's assigned block.
 */
async function handleGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const requestedBlock = req.nextUrl.searchParams.get("block_id");
  const sessionIdParam = req.nextUrl.searchParams.get("session_id");

  const { rows: uRows } = await query<{ hostel_block: string | null; assigned_hostel: string | null }>(
    `SELECT hostel_block, assigned_hostel FROM public.users WHERE id = $1::uuid LIMIT 1`,
    [auth.userId],
  );
  const myBlock = uRows[0]?.hostel_block ?? uRows[0]?.assigned_hostel ?? null;

  if (auth.role === "caretaker") {
    if (!myBlock) {
      return fail("NO_BLOCK_ASSIGNED", "Caretaker has no assigned hostel block", 403);
    }
    if (requestedBlock && requestedBlock !== myBlock) {
      return fail("FORBIDDEN_BLOCK", "Caretaker can only view their own hostel block", 403);
    }
  }

  const blockId = requestedBlock ?? myBlock;
  if (!blockId) {
    return fail("MISSING_BLOCK", "block_id is required", 400);
  }

  const { rows: sessionRows } = await query<{
    id: string;
    meal_date: string;
    meal_type: string;
    window_opens_at: string;
    window_closes_at: string;
  }>(
    sessionIdParam
      ? `SELECT id, meal_date::text, meal_type, window_opens_at, window_closes_at
           FROM public.mess_days WHERE id = $1::uuid LIMIT 1`
      : `SELECT id, meal_date::text, meal_type, window_opens_at, window_closes_at
           FROM public.mess_days WHERE is_active = true ORDER BY window_opens_at DESC LIMIT 1`,
    sessionIdParam ? [sessionIdParam] : [],
  );
  const session = sessionRows[0];
  if (!session) return fail("NO_SESSION", "No active meal session", 404);

  const { rows: residents } = await query<{
    id: string;
    roll_no: string;
    name: string;
    hostel_block: string;
    last_scan: string | null;
  }>(
    `SELECT u.id, u.unique_id AS roll_no, u.name, u.hostel_block,
            MAX(mse.scanned_at) FILTER (WHERE mse.session_id = $1::uuid AND mse.outcome = 'ok') AS last_scan
       FROM public.users u
       LEFT JOIN public.mess_scan_events mse ON mse.student_id = u.id
      WHERE u.hostel_block = $2
        AND u.role = 'student'
        AND u.deleted_at IS NULL
      GROUP BY u.id
      ORDER BY last_scan NULLS FIRST, u.unique_id ASC`,
    [session.id, blockId],
  );

  const { rows: feed } = await query(
    `SELECT mse.id, mse.scanned_at, mse.outcome, mse.reason_text,
            u.unique_id AS roll_no, u.name AS student_name
       FROM public.mess_scan_events mse
       JOIN public.users u ON u.id = mse.student_id
      WHERE mse.session_id = $1::uuid
        AND u.hostel_block = $2
      ORDER BY mse.scanned_at DESC
      LIMIT 30`,
    [session.id, blockId],
  );

  const scannedCount = residents.filter((r) => r.last_scan !== null).length;

  return ok({
    block_id: blockId,
    session,
    expected: residents.length,
    scanned: scannedCount,
    not_scanned: residents.length - scannedCount,
    residents,
    feed,
  });
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["caretaker", "hostel_manager", "admin", "sysadmin"],
});
