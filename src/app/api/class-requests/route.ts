// src/app/api/class-requests/route.ts
// POST /api/class-requests — raise a class request (individual lane).
// GET  /api/class-requests — student: own requests; owner role: their queue;
//                            HOD: class-scoped queue.
// Auth: JWT via withAuthorization. Mutations go through the kernel.

import { NextRequest } from "next/server";
import { withAuthorization } from "@/middleware/authorization";
import { ok, fail } from "@/server/http/response";
import type { AuthContext } from "@/lib/authContext";
import { query } from "@/lib/postgres";
import {
  raiseClassRequest,
  REQUEST_CATEGORIES,
  type RequestCategory,
} from "@/lib/class-requests";

async function implPost(req: NextRequest, { auth }: { auth: AuthContext }) {
  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.classId || !body?.category) {
    return fail("VALIDATION_ERROR", "title, classId, category are required", 400);
  }
  const category = body.category as RequestCategory;
  if (!REQUEST_CATEGORIES.includes(category)) {
    return fail("VALIDATION_ERROR", `category must be one of ${REQUEST_CATEGORIES.join(", ")}`, 400);
  }

  try {
    const result = await raiseClassRequest({
      studentId: auth.userId,
      classId: body.classId,
      category,
      title: String(body.title).slice(0, 120),
      body: body.body ? String(body.body) : undefined,
      priority: body.priority === "urgent" ? "urgent" : "normal",
    });
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to raise request";
    return fail("DOMAIN_ERROR", msg, 400);
  }
}

async function implGet(req: NextRequest, { auth }: { auth: AuthContext }) {
  const params = req.nextUrl.searchParams;

  // Student: own requests (default), or a specific one.
  if (auth.role === "student") {
    const specific = params.get("id");
    if (specific) {
      const { rows } = await query(
        `SELECT id, category_code, title, body, priority, status, assigned_role,
                routed_at, resolved_at, resolution_note, created_at
           FROM public.class_requests WHERE id = $1 AND student_id = $2`,
        [specific, auth.userId],
      );
      if (rows.length === 0) return fail("NOT_FOUND", "Request not found", 404);
      return ok(rows[0]);
    }
    const { rows } = await query(
      `SELECT id, category_code, title, priority, status, assigned_role,
              class_id AS "class", routed_at, resolved_at, created_at
         FROM public.class_requests WHERE student_id = $1
        ORDER BY created_at DESC LIMIT 50`,
      [auth.userId],
    );
    return ok(rows);
  }

  // Faculty/HOD owner queue: requests routed to them. Also ?queue=class for a
  // coordinator's read-only view of their class's open requests (D3).
  if (["faculty", "hod", "oie", "vice_principal"].includes(auth.role) || params.get("queue") === "class") {
    // Coordinator read-only view (?queue=class&classId=): open requests for that class.
    if (params.get("queue") === "class") {
      const classToken = params.get("classId");
      if (!classToken) return fail("VALIDATION_ERROR", "classId required for queue=class", 400);
      const { rows } = await query(
        `SELECT cr.id, cr.category_code, cr.title, cr.priority, cr.status, cr.created_at
           FROM public.class_requests cr
          WHERE cr.class_id = $1 AND cr.status IN ('open','in_progress','escalated')
          ORDER BY cr.created_at ASC LIMIT 100`,
        [classToken],
      );
      return ok(rows);
    }

    // Faculty/HOD owner queue: requests routed to them.
    const status = params.get("status") ?? "open";
    let sql = `SELECT cr.id, cr.category_code, cr.title, cr.priority, cr.status,
                       cr.student_id, u.name AS student_name, cr.class_id, c.name AS class_name,
                       cr.created_at, cr.routed_at, cr.resolved_at
                 FROM public.class_requests cr
                 JOIN public.users u ON u.id = cr.student_id
                 LEFT JOIN public.classes c ON c.id = cr.class_id`;
    const args: (string | number)[] = [];
    const where: string[] = [];
    if (auth.role === "faculty" || auth.role === "oie") {
      args.push(status, auth.role, auth.userId);
      where.push(`cr.status = $1 AND (cr.assigned_role = $2 AND cr.assigned_user_id = $3)`);
    } else {
      args.push(status);
      where.push(`cr.status = $1`);
    }
    sql += ` WHERE ${where.join(" AND ")}`;
    if (params.get("classId")) {
      args.push(params.get("classId")!);
      sql += ` AND cr.class_id = $${args.length}`;
    }
    sql += ` ORDER BY (cr.priority = 'urgent') DESC, cr.created_at ASC LIMIT 100`;
    const { rows } = await query(sql, args as never[]);
    return ok(rows);
  }

  // HOD: class-scoped (already covered above). Admin: everything.
  if (auth.role === "admin" || auth.role === "sysadmin") {
    const { rows } = await query(
      `SELECT cr.id, cr.category_code, cr.title, cr.priority, cr.status,
              cr.student_id, u.name AS student_name, cr.class_id, c.name AS class_name,
              cr.created_at
         FROM public.class_requests cr
         JOIN public.users u ON u.id = cr.student_id
         LEFT JOIN public.classes c ON c.id = cr.class_id
        ORDER BY cr.created_at DESC LIMIT 200`,
    );
    return ok(rows);
  }

  return fail("FORBIDDEN", "Not permitted to view class requests", 403);
}

export const POST = withAuthorization(implPost, {});
export const GET = withAuthorization(implGet, {});
