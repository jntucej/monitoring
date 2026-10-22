// src/app/api/admin/student-representatives/route.ts
// GET  — list student representatives.
// POST — appoint a student representative (enforcing appointer role vs scope type).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import { addAudit } from "@/lib/db";
import type { AuthContext } from "@/lib/authContext";
import type { Role } from "@/lib/types";

const ALLOWED_APPOINTERS: Record<string, string[]> = {
  class: ["hod", "admin", "sysadmin", "principal"],
  department: ["hod", "admin", "sysadmin", "principal"],
  block: ["deputy_warden", "hostel_manager", "admin", "sysadmin", "principal"],
  hostel: ["deputy_warden", "hostel_manager", "admin", "sysadmin", "principal"],
  mess: ["principal", "admin", "sysadmin"],
  girls: ["principal", "admin", "sysadmin"],
};

async function handleGet(_req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["hod", "deputy_warden", "hostel_manager", "principal", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Not allowed", 403);
  }

  const { rows } = await query(
    `SELECT r.id, r.student_id AS "studentId", u.name AS "studentName", u.unique_id AS "studentRoll",
            r.scope_type AS "scopeType", r.scope_id AS "scopeId", r.valid_from AS "validFrom",
            r.valid_to AS "validTo", r.status, r.created_at AS "createdAt"
       FROM public.student_representatives r
       JOIN public.users u ON u.id = r.student_id
      ORDER BY r.created_at DESC
      LIMIT 200`,
  );

  return ok({ representatives: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const body = (await req.json().catch(() => ({}))) as {
    studentId?: string;
    scopeType?: string;
    scopeId?: string;
    validTo?: string;
  };

  const studentId = (body.studentId ?? "").trim();
  const scopeType = (body.scopeType ?? "").trim();
  const scopeId = (body.scopeId ?? "").trim();
  const validTo = (body.validTo ?? "").trim();

  if (!studentId || !scopeType || !scopeId || !validTo) {
    return fail("VALIDATION_ERROR", "studentId, scopeType, scopeId, and validTo required", 400);
  }

  const allowedRoles = ALLOWED_APPOINTERS[scopeType];
  if (!allowedRoles || !allowedRoles.includes(auth.role)) {
    return fail("FORBIDDEN", `Your role (${auth.role}) cannot appoint a representative for scope ${scopeType}`, 403);
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO public.student_representatives (
       student_id, scope_type, scope_id, appointed_by, appointed_role, valid_to
     ) VALUES ($1::uuid, $2, $3, $4::uuid, $5, $6::date)
     RETURNING id`,
    [studentId, scopeType, scopeId, auth.userId, auth.role, validTo],
  );

  await addAudit({
    action: "STUDENT_REP_APPOINTED",
    userId: auth.userId,
    role: auth.role as Role,
    details: { repId: rows[0].id, studentId, scopeType, scopeId },
  });

  return ok({ representativeId: rows[0].id, appointed: true });
}

export const GET = withAuthorization(handleGet);
export const POST = withAuthorization(handlePost);
