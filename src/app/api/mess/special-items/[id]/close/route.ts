import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const parts = new URL(req.url).pathname.split("/");
  const id = parts[parts.length - 2];
  if (!id) return fail("MISSING_ID", "Schedule id is required", 400);

  const { rows } = await query<{ id: string; item_name: string }>(
    `UPDATE public.mess_special_schedules
        SET status = 'closed'
      WHERE id = $1::uuid
      RETURNING id, item_name`,
    [id],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Special schedule not found", 404);

  await addAudit({
    action: "MESS_SPECIAL_CLOSED",
    userId: auth.userId,
    role: auth.role,
    details: { scheduleId: id, itemName: rows[0].item_name },
  });

  return ok({ id: rows[0].id, status: "closed" });
}

export const POST = withAuthorization(handlePost, {
  requiredRole: ["mess_incharge", "admin", "sysadmin"],
});
