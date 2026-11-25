import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";

async function handlePost(req: NextRequest) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const studentId = String(b?.student_id ?? "").trim();
  const isCr = b?.is_cr !== false;
  if (!studentId) return fail("INVALID_INPUT", "student_id is required", 400);

  const { rows } = await query<{ user_id: string; class_representative: boolean }>(
    `UPDATE public.student_details
        SET class_representative = $2
      WHERE user_id = $1::uuid
      RETURNING user_id, class_representative`,
    [studentId, isCr],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Student details not found", 404);
  return ok(rows[0]);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["hod", "dean", "admin", "sysadmin"],
});
