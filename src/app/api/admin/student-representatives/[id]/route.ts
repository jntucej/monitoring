// src/app/api/admin/student-representatives/[id]/route.ts
// DELETE — revoke a student representative appointment.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

function getId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] ?? "");
}

async function handleDelete(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  if (!["hod", "deputy_warden", "hostel_manager", "principal", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const id = getId(req);
  if (!id) return fail("VALIDATION_ERROR", "ID required", 400);

  const { rows } = await query<{ id: string }>(
    `UPDATE public.student_representatives
        SET status = 'revoked'
      WHERE id = $1::uuid
      RETURNING id`,
    [id],
  );
  if (!rows[0]) return fail("NOT_FOUND", "Representative not found", 404);

  await addAudit({
    action: "STUDENT_REP_REVOKED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { repId: id },
  });

  return ok({ revoked: true, repId: id });
}

export const DELETE = withAuthorization(handleDelete);
