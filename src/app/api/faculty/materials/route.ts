// /api/faculty/materials/route.ts
// Study material upload (STEP 3.2): faculty post links to notes/video
// for their classes; students list for their classes.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function implGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const classId = req.nextUrl.searchParams.get("classId");
  let sql = `SELECT id, class_id, faculty_id, title, url, kind, created_at
               FROM public.study_materials`;
  const params: unknown[] = [];
  if (auth.role === "student" || auth.role === "parent" || auth.role === "guardian") {
    // Students see materials for their own class (year/section/department
    // match via student_details).
    params.push(auth.userId);
    sql += ` WHERE class_id IN (
               SELECT c2.id FROM public.classes c2
                 JOIN public.student_details sd2 ON sd2.department = c2.department_id::text
                 WHERE sd2.user_id = $1 AND sd2.year = c2.year AND sd2.section = c2.section
               LIMIT 50)`;
  } else {
    params.push(auth.userId);
    sql += ` WHERE faculty_id = $1`;
  }
  if (classId) { sql += ` AND class_id = $${params.push(classId)}`; }
  sql += " ORDER BY created_at DESC LIMIT 200";
  const { rows } = await query(sql, params);
  return ok({ materials: rows });
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    classId?: string; title?: string; url?: string; kind?: string;
  } | null;
  if (!body?.classId || !body.title?.trim() || !body.url?.trim()) {
    return fail("VALIDATION_ERROR", "classId, title and url are required", 400);
  }
  const kind = (body.kind ?? "PDF").toUpperCase();
  if (!["PDF", "VIDEO", "LINK", "FOLDER", "OTHER"].includes(kind)) {
    return fail("VALIDATION_ERROR", "kind must be PDF|VIDEO|LINK|FOLDER|OTHER", 400);
  }
  // Faculty can only post to their assigned classes.
  const { rows: mine } = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM public.faculty_assignments
      WHERE faculty_id = $1 AND class_id = $2 AND status = 'ACTIVE'`,
    [auth.userId, body.classId],
  );
  if (Number(mine[0].n) === 0) {
    return fail("FORBIDDEN", "Class is not assigned to you", 403);
  }
  await query(
    `INSERT INTO public.study_materials (class_id, faculty_id, title, url, kind)
     VALUES ($1, $2, $3, $4, $5)`,
    [body.classId, auth.userId, body.title.trim(), body.url.trim(), kind],
  );
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "faculty_material_post",
    resource: "study_materials", resourceId: body.classId,
    afterState: { title: body.title, kind },
  });
  return ok({ posted: true });
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["faculty", "student", "parent", "guardian", "hod", "admin", "sysadmin"] }),
  { keyPrefix: "faculty-materials-get", maxRequests: 30, windowMs: 60_000 },
);

export const POST = withRateLimit(
  withMutationGuard(implPost, { requiredRole: ["faculty"] }),
  { keyPrefix: "faculty-materials-post", maxRequests: 10, windowMs: 60_000 },
);
