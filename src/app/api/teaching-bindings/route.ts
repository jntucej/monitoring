// src/app/api/teaching-bindings/route.ts
// GET /api/teaching-bindings?userId=<uuid>
// Returns active faculty_assignments for the given user.
// Auth: any authenticated user (the caller passes their own userId).

import { NextRequest } from "next/server";
import { query } from "@/lib/postgres";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

interface TeachingBindingRow {
  subject_code: string;
  class_id: string;
  class_name: string;
  role: string;
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const params = req.nextUrl.searchParams;
  const requestedId = params.get("userId");

  // Only allow checking your own bindings (or admin/sysadmin checking anyone)
  const isPrivileged = auth.role === "admin" || auth.role === "sysadmin";
  const targetId = isPrivileged ? (requestedId ?? auth.userId) : auth.userId;

  if (!targetId) return fail("VALIDATION_ERROR", "userId required", 400);

  const { rows } = await query<TeachingBindingRow>(
    `SELECT fa.subject_code AS subject_code,
            fa.class_id     AS class_id,
            COALESCE(c.name, fa.class_id::text) AS class_name,
            fa.role
       FROM public.faculty_assignments fa
       LEFT JOIN public.classes c ON c.id = fa.class_id
      WHERE fa.faculty_id = $1::uuid
        AND fa.is_active  = TRUE
      ORDER BY fa.subject_code`,
    [targetId],
  );

  return ok({
    data: rows.map((r) => ({
      subjectCode: r.subject_code,
      classId: r.class_id,
      className: r.class_name,
      role: r.role,
    })),
  });
}

export const GET = withAuthorization(implGet, {});
