import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { assertCsrf } from "@/lib/csrf";
import { query } from "@/lib/postgres";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";

async function handleGet(req: NextRequest) {
  const classId = req.nextUrl.searchParams.get("class_id");
  const { rows } = await query(
    `SELECT sm.*, u.name AS faculty_name
       FROM public.study_materials sm
       JOIN public.users u ON u.id = sm.faculty_id
      WHERE ($1::text IS NULL OR sm.class_id = $1)
      ORDER BY sm.created_at DESC LIMIT 50`,
    [classId],
  );
  return ok({ materials: rows });
}

async function handlePost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const csrfErr = assertCsrf(req);
  if (csrfErr) return csrfErr;

  const b = await req.json().catch(() => null);
  const classId = String(b?.class_id ?? "").trim();
  const subjectCode = String(b?.subject_code ?? "").trim();
  const title = String(b?.title ?? "").trim();
  const fileUrl = String(b?.file_url ?? "").trim();
  if (!classId || !subjectCode || !title || !fileUrl) {
    return fail("INVALID_INPUT", "class_id, subject_code, title, and file_url are required", 400);
  }

  const { rows } = await query(
    `INSERT INTO public.study_materials (faculty_id, class_id, subject_code, title, file_url, description)
     VALUES ($1::uuid, $2, $3, $4, $5, $6) RETURNING *`,
    [auth.userId, classId, subjectCode, title, fileUrl, b?.description ?? null],
  );
  return ok(rows[0], 201);
}

export const GET = withAuthorization(handleGet, {
  requiredRole: ["student", "faculty", "hod", "dean", "principal", "admin", "sysadmin"],
});
export const POST = withAuthorization(handlePost, {
  requiredRole: ["faculty", "hod", "admin", "sysadmin"],
});
