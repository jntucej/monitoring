import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet() {
  const { rows } = await query(
    `SELECT hra.*, u.name AS student_name, u.unique_id AS roll_number
       FROM public.hostel_room_allotments hra
       JOIN public.users u ON u.id = hra.student_id
      ORDER BY hra.allotted_at DESC LIMIT 100`,
  );
  return ok({ allotments: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const studentId = String(b?.student_id ?? "").trim();
  const blockId = String(b?.block_id ?? "").trim();
  const roomNumber = String(b?.room_number ?? "").trim();
  if (!studentId || !blockId || !roomNumber) {
    return fail("INVALID_INPUT", "student_id, block_id, and room_number are required", 400);
  }

  const { rows } = await query(
    `INSERT INTO public.hostel_room_allotments (student_id, block_id, room_number, status, allotted_by)
     VALUES ($1::uuid, $2, $3, 'allotted', $4::uuid) RETURNING *`,
    [studentId, blockId, roomNumber, auth.userId],
  );
  await query(
    `UPDATE public.student_details SET hostel_block = $2, room_number = $3 WHERE user_id = $1::uuid`,
    [studentId, blockId, roomNumber],
  );
  return ok(rows[0], 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["caretaker", "deputy_warden", "hostel_manager", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["deputy_warden", "hostel_manager", "principal", "admin", "sysadmin"],
});
