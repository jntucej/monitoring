// /api/faculty/assignments/route.ts
// Faculty assignment creation + listing (STEP 3.2). Scoped to the
// faculty's assigned classes.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { withMutationGuard } from "@/server/http/mutation-guard";
import { ok, fail } from "@/server/http/response";
import { query } from "@/lib/postgres";
import type { AuthContext } from "@/lib/authContext";
import { recordMutationAudit } from "@/middleware/entityAuthorization";

async function myClasses(auth: AuthContext): Promise<string[]> {
  const res = await query<{ class_id: string }>(
    `SELECT DISTINCT class_id FROM public.faculty_assignments
      WHERE faculty_id = $1 AND status = 'ACTIVE'`, [auth.userId]);
  const res2 = await query<{ id: string }>(
    `SELECT id FROM public.classes WHERE class_teacher_id = $1`, [auth.userId]);
  return [...new Set([...res.rows.map((r) => r.class_id), ...res2.rows.map((r) => r.id)])];
}

async function implGet(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const classes = await myClasses(auth);
  const status = req.nextUrl.searchParams.get("status")?.toUpperCase() || null;
  let sql = `SELECT a.id, a.class_id, a.title, a.description, a.due_at,
                    a.max_score::text AS max_score, a.status,
                    (SELECT COUNT(*)::text FROM public.assignment_submissions s
                      WHERE s.assignment_id = a.id) AS submissions
               FROM public.assignments a
              WHERE a.faculty_id = $1`;
  const params: unknown[] = [auth.userId];
  if (status) { sql += ` AND a.status = $${params.push(status)}`; }
  sql += " ORDER BY a.created_at DESC LIMIT 100";
  const { rows } = await query(sql, params);
  return ok({ assignments: rows, myClasses: classes });
}

async function implPost(req: NextRequest, ctx: { auth: AuthContext }) {
  const { auth } = ctx;
  const body = (await req.json().catch(() => null)) as {
    classId?: string; title?: string; description?: string;
    dueAt?: string; maxScore?: number;
  } | null;
  if (!body?.classId || !body.title?.trim()) {
    return fail("VALIDATION_ERROR", "classId and title are required", 400);
  }
  const classes = await myClasses(auth);
  if (!classes.includes(body.classId)) {
    return fail("FORBIDDEN", "Class is not assigned to you", 403);
  }
  const { rows } = await query(
    `INSERT INTO public.assignments (class_id, faculty_id, title, description, due_at, max_score)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, status`,
    [body.classId, auth.userId, body.title.trim(), body.description?.trim() || null,
     body.dueAt || null, body.maxScore ?? 10],
  );
  await recordMutationAudit({
    actorId: auth.userId, roleContext: auth.role, action: "faculty_assignment_create",
    resource: "assignments", resourceId: rows[0].id,
    afterState: { classId: body.classId, title: body.title },
  });
  return ok(rows[0]);
}

export const GET = withRateLimit(
  withAuthorization(implGet, { requiredRole: ["faculty", "student", "hod", "admin", "sysadmin"] }),
  { keyPrefix: "faculty-assignments-get", maxRequests: 30, windowMs: 60_000 },
);

export const POST = withRateLimit(
  withMutationGuard(implPost, { requiredRole: ["faculty"] }),
  { keyPrefix: "faculty-assignments-post", maxRequests: 10, windowMs: 60_000 },
);
