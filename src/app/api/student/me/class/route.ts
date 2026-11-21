// src/app/api/student/me/class/route.ts
// GET /api/student/me/class — the calling student's class identity.
// Returns { classId, department, classLabel }.
//
// The classes table may be empty (classes are keyed by department + section).
// When a matching row exists, classId is its uuid; otherwise the caller should
// use `department` as the class-identity token (class_requests class_id).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { query } from "@/lib/postgres";

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  // The calling student's class identity. Department lives on
  // student_details (TEXT codes like CSE/EEE); classes is keyed by
  // department_id. When a classes row exists, classId is its uuid, else the
  // department code is the class-identity token.
  const { rows: me } = await query<{ dept: string | null }>(
    `SELECT sd.department AS dept
       FROM public.student_details sd
      WHERE sd.user_id = $1::uuid LIMIT 1`,
    [auth.userId],
  );
  const dept = me[0]?.dept ?? null;
  if (!dept) return ok({ classId: null, department: null, classLabel: null });

  const { rows: cls } = await query<{ id: string; name: string | null }>(
    `SELECT id, name FROM public.classes WHERE department_id = $1 LIMIT 1`,
    [dept],
  );

  return ok({
    classId: cls[0]?.id ?? dept,
    department: dept,
    classLabel: cls[0]?.name ?? dept,
  });
}

export const GET = withAuthorization(implGet, {});
