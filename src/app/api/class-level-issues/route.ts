// src/app/api/class-level-issues/route.ts
// GET /api/class-level-issues?classId=&status= — HOD/faculty queue.
// POST — HOD raises a class-level issue directly (bypasses aggregation).

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { query } from "@/lib/postgres";
import { createClassLevelIssue } from "@/lib/class-requests";

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const allowed = ["hod", "vice_principal", "admin", "sysadmin", "faculty"];
  if (!allowed.includes(auth.role)) {
    return fail("FORBIDDEN", "Not permitted to view class-level issues", 403);
  }
  const params = req.nextUrl.searchParams;
  const classId = params.get("classId");
  const status = params.get("status") ?? "open";

  let sql = `SELECT i.id, i.topic, i.status, i.request_ids, i.resolution,
                    i.created_at, i.resolved_at, c.name AS class_name
               FROM public.class_level_issues i
               LEFT JOIN public.classes c ON c.id = i.class_id`;
  const where: string[] = [];
  const args: string[] = [];
  if (classId) { args.push(classId); where.push(`i.class_id = $${args.length}`); }
  args.push(status); where.push(`i.status = $${args.length}`);
  sql += where.length ? ` WHERE ${where.join(" AND ")}` : "";
  sql += ` ORDER BY i.created_at DESC LIMIT 100`;

  const { rows } = await query(sql, args);
  return ok({ success: true, data: rows });
}

async function implPost(req: NextRequest, { auth }: { auth: AuthContext }) {
  if (!["hod", "vice_principal", "admin", "sysadmin"].includes(auth.role)) {
    return fail("FORBIDDEN", "Only HOD/VP/admin may raise class-level issues", 403);
  }
  const body = await req.json().catch(() => null);
  if (!body?.classId || !body?.topic) {
    return fail("VALIDATION_ERROR", "classId and topic are required", 400);
  }
  try {
    const id = await createClassLevelIssue(body.classId, String(body.topic), [], auth.userId);
    if (!id) return fail("CONFLICT", "An open issue for this class+topic already exists", 409);
    return ok({ success: true, id });
  } catch (e) {
    return fail("DOMAIN_ERROR", e instanceof Error ? e.message : "Failed to create issue", 400);
  }
}

export const GET = withAuthorization(implGet, {});
export const POST = withAuthorization(implPost, {});
