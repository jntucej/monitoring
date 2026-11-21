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
              class_id AS "class", routed_at, resolved_at, created_at,
              sla_due_at, decision_required, decision_recommendation
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

      // P5 — privacy: the coordinator may see the *class's* aggregate picture,
      // not every student's private complaint. Resolve the coordinator's
      // capability and return only class-level visibility:
      //   • the class's open class_level_issues (the collective lane),
      //   • requests that are themselves collective (raised_by_rep = TRUE),
      //   • a per-category open count for aggregate awareness.
      const { canReadClassRequests } = await import("@/lib/class-coordinator");
      if (!(await canReadClassRequests(auth.userId, classToken))) {
        return fail("FORBIDDEN", "Not an active coordinator of this class", 403);
      }

      // class_level_issues keyed by class uuid OR department code (uuid/text
      // mismatch in this dataset) — match the same way the owner-queue joins do.
      const { rows: issues } = await query<{ id: string; topic: string; status: string; request_count: number; created_at: string }>(
        `SELECT i.id, i.topic, i.status,
                COALESCE(cardinalities.n, 0) AS request_count,
                i.created_at
           FROM public.class_level_issues i
           LEFT JOIN LATERAL (SELECT cardinality(i.request_ids) AS n) cardinalities ON TRUE
          WHERE i.status IN ('open','in_progress')
            AND (i.class_id = $1 OR $2 = $1)
          ORDER BY i.created_at DESC LIMIT 50`,
        [classToken, classToken],
      );
      const { rows: collectiveReqs } = await query<{ id: string; category_code: string; title: string; status: string; created_at: string }>(
        `SELECT cr.id, cr.category_code, cr.title, cr.status, cr.created_at
           FROM public.class_requests cr
          WHERE cr.class_id = $1 AND cr.raised_by_rep = TRUE
            AND cr.status IN ('open','in_progress','escalated')
          ORDER BY cr.created_at DESC LIMIT 100`,
        [classToken],
      );
      const { rows: openCounts } = await query<{ category_code: string; n: number }>(
        `SELECT category_code, count(*)::int AS n
           FROM public.class_requests
          WHERE class_id = $1 AND status IN ('open','in_progress','escalated')
          GROUP BY category_code`,
        [classToken],
      );
      return ok({
        classId: classToken,
        // Aggregate: how many open requests per category (no bodies, no student names)
        openByCategory: openCounts,
        // Collective lane: the class's own level issues (the "collect concerns" view)
        levelIssues: issues,
        // Only requests explicitly raised as collective (by a rep) — not private ones
        collectiveRequests: collectiveReqs,
      });
    }

    // Faculty/HOD owner queue: requests routed to them.
    const status = params.get("status") ?? "open";
    let sql = `SELECT cr.id, cr.category_code, cr.title, cr.priority, cr.status,
                       cr.student_id, u.name AS student_name, cr.class_id, c.name AS class_name,
                       cr.created_at, cr.routed_at, cr.resolved_at
                 FROM public.class_requests cr
                 JOIN public.users u ON u.id = cr.student_id
                 LEFT JOIN public.classes c ON (c.id::text = cr.class_id
                        OR c.department_id = cr.class_id)`;
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
         LEFT JOIN public.classes c ON (c.id::text = cr.class_id
                OR c.department_id = cr.class_id)
        ORDER BY cr.created_at DESC LIMIT 200`,
    );
    return ok(rows);
  }

  return fail("FORBIDDEN", "Not permitted to view class requests", 403);
}

export const POST = withAuthorization(implPost, {});
export const GET = withAuthorization(implGet, {});
