import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";

async function handlePost(req: NextRequest) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const shiftId = parts[parts.length - 2];
  if (!shiftId) return fail("MISSING_ID", "shift id is required", 400);

  const { rows } = await query(
    `UPDATE public.security_shifts
        SET status = 'closed', closed_at = NOW()
      WHERE id = $1::uuid
      RETURNING id, status, closed_at`,
    [shiftId],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Shift not found", 404);

  await query(
    `UPDATE public.shift_post_assignments
        SET status = CASE WHEN status = 'assigned' THEN 'no_show' ELSE 'checked_out' END,
            checked_out_at = CASE WHEN status = 'checked_in' THEN NOW() ELSE checked_out_at END
      WHERE shift_id = $1::uuid AND status IN ('assigned', 'checked_in')`,
    [shiftId],
  );

  return ok(rows[0]);
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["supervisor", "admin", "sysadmin"],
});
