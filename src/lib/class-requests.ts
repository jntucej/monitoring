// src/lib/class-requests.ts
// Individual request lane kernel: raise, route, aggregate.
// Reuses complaint-routing taxonomy concepts; falls back to category table.

import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/lib/audit";
import { randomUUID } from "crypto";

// Best-effort in-app notification (mirrors the cron birthday-check pattern).
async function notifyUser(userId: string, type: string, title: string, message: string, data: Record<string, unknown> = {}) {
  try {
    await query(
      `INSERT INTO public.notifications
         (id, type, priority, title, message, recipient_id, recipient_type, channels, data)
       VALUES ($1, $2, $3, $4, $5, $6, 'user', ARRAY['in_app'], $7)`,
      [randomUUID(), type, "normal", title, message, userId, JSON.stringify(data)],
    );
  } catch {
    // notifications are best-effort; do not fail the action
  }
}

async function audit(action: string, userId: string, details: Record<string, unknown>) {
  await logAuditEvent({ action: action as never, userId, userName: "", userRole: "", details });
}

export const REQUEST_CATEGORIES = [
  "ACADEMIC",
  "ATTENDANCE",
  "EXAM",
  "TIMETABLE",
  "ROOM",
  "FACULTY",
  "SUGGESTION",
  "URGENT",
] as const;
export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];

// Category → owner role. Fallback: HOD of the class's department.
const CATEGORY_ROUTE: Record<RequestCategory, string> = {
  ACADEMIC: "class_teacher",
  ATTENDANCE: "class_teacher",
  ROOM: "class_teacher",
  SUGGESTION: "class_teacher",
  EXAM: "oie",
  TIMETABLE: "hod",
  FACULTY: "hod", // never the named faculty
  URGENT: "hod", // pages HOD immediately
};

export interface RaiseInput {
  studentId: string;
  classId: string;
  category: RequestCategory;
  title: string;
  body?: string;
  priority?: "normal" | "urgent";
  raisedByRep?: boolean;
  actorId?: string; // when raised_by_rep, the rep's user id
}

export async function raiseClassRequest(input: RaiseInput) {
  const { studentId, classId, category, title, body, priority = "normal", raisedByRep = false, actorId } = input;

  // 1. verify student belongs to class (class_id is the class uuid when the
  // classes table is populated, else the department code).
  const { rows: cls } = await query<{ name: string; department_id: string; class_teacher_id: string | null }>(
    `SELECT c.name, c.department_id, c.class_teacher_id
       FROM public.classes c
      WHERE c.id::text = $1 LIMIT 1`,
    [classId],
  );
  let classRow = cls[0];
  // Fallback: treat classId as a department code (empty classes table).
  if (!classRow) {
    const { rows: byDept } = await query<{ name: string; department_id: string; class_teacher_id: string | null }>(
      `SELECT c.name, c.department_id, c.class_teacher_id
         FROM public.classes c WHERE c.department_id = $1 LIMIT 1`,
      [classId],
    );
    classRow = byDept[0];
  }
  if (!classRow) {
    // No class row at all — verify the student's department (student_details)
    // matches the class token (department code when classes is empty).
    const { rows: stud } = await query<{ dept: string | null }>(
      `SELECT sd.department AS dept FROM public.student_details sd WHERE sd.user_id = $1::uuid LIMIT 1`,
      [studentId],
    );
    if (stud.length === 0 || stud[0].dept !== classId) {
      throw new Error("Student is not in this class");
    }
    classRow = { name: classId, department_id: classId, class_teacher_id: null };
  }

  // 2. route: category → owner role → concrete user
  const ownerRole = CATEGORY_ROUTE[category];
  let assignedRole: string;
  let assignedUserId: string | null = null;
  if (ownerRole === "class_teacher") {
    if (classRow.class_teacher_id) {
      assignedRole = "faculty";
      assignedUserId = classRow.class_teacher_id;
    } else {
      assignedRole = "hod"; // fallback
      assignedUserId = await getHodForDept(classRow.department_id);
    }
  } else if (ownerRole === "hod") {
    assignedRole = "hod";
    assignedUserId = await getHodForDept(classRow.department_id);
  } else {
    // oie (EXAM): route to OIE role (no single user binding in v1)
    assignedRole = ownerRole;
  }

  // 3. urgent → page HOD now (notifier filled in after insert)
  const isUrgent = priority === "urgent" || category === "URGENT";

  // 4. INSERT
  const dedupeKey = `${classId}:${category}:${title.trim().toLowerCase()}`;
  const { rows: ins } = await query<{ id: string }>(
    `INSERT INTO public.class_requests
       (student_id, class_id, category_code, title, body, priority, status,
        assigned_role, assigned_user_id, raised_by_rep, dedupe_key, routed_at)
     VALUES ($1,$2,$3,$4,$5,$6,'open',$7,$8,$9,$10,NOW())
     RETURNING id`,
    [studentId, classId, category, title, body ?? null, priority,
     assignedRole, assignedUserId, raisedByRep, dedupeKey],
  );
  const id = ins[0].id;

  if (isUrgent) {
    await notifyHodOfUrgent(classRow.department_id, `${title} (${category}) — class ${classRow.name}`, id);
  }

  await audit("class_request.raise", actorId ?? studentId, {
    targetId: id, category, classId, priority, raisedByRep,
  });

  return { id, status: "open", assignedRole, assignedUserId, classId };
}

export async function resolveClassRequest(requestId: string, actorId: string, note: string, targetRole: string) {
  const { rows } = await query<{ class_id: string; student_id: string; category_code: string }>(
    `SELECT class_id, student_id, category_code FROM public.class_requests WHERE id = $1`,
    [requestId],
  );
  if (rows.length === 0) throw new Error("Request not found");
  const row = rows[0];

  await query(
    `UPDATE public.class_requests
        SET status = 'resolved', resolved_at = NOW(), resolution_note = $1
      WHERE id = $2`,
    [note, requestId],
  );

  await notifyUser(row.student_id, "class_request_resolved", "Your class request was resolved", note, { request_id: requestId });
  await audit("class_request.resolve", actorId, { targetId: requestId, note, targetRole });
  return { id: requestId, status: "resolved" };
}

export async function escalateClassRequest(requestId: string, actorId: string, reason: string, targetRole: string) {
  await query(
    `UPDATE public.class_requests SET status = 'escalated' WHERE id = $1`,
    [requestId],
  );
  await audit("class_request.escalate", actorId, { targetId: requestId, reason, targetRole });
  return { id: requestId, status: "escalated" };
}

export async function closeClassRequest(requestId: string, actorId: string) {
  await query(
    `UPDATE public.class_requests SET status = 'closed', resolved_at = NOW() WHERE id = $1`,
    [requestId],
  );
  await audit("class_request.close", actorId, { targetId: requestId });
  return { id: requestId, status: "closed" };
}

// Aggregation input: counts of open requests per (class, category) in window.
export interface AggGroup {
  class_id: string;
  category_code: string;
  count: number;
  request_ids: string[];
}

export async function findAggregatableIssues(hours: number, n: number): Promise<AggGroup[]> {
  const { rows } = await query<AggGroup>(
    `SELECT class_id, category_code, count(*)::int AS count,
            array_agg(id::text) AS request_ids
       FROM public.class_requests
      WHERE status IN ('open','in_progress','escalated')
        AND created_at >= NOW() - make_interval(hours => $1)
      GROUP BY class_id, category_code
      HAVING count(*) >= $2
      ORDER BY class_id, category_code`,
    [hours, n],
  );
  return rows;
}

export async function createClassLevelIssue(
  classId: string,
  topic: string,
  requestIds: string[],
  actorId: string,
): Promise<string | null> {
  // No-duplicate: one open issue per (class, topic).
  const { rows: existing } = await query<{ id: string }>(
    `SELECT id FROM public.class_level_issues
      WHERE class_id = $1 AND topic = $2 AND status IN ('open','in_progress') LIMIT 1`,
    [classId, topic],
  );
  if (existing.length > 0) return existing[0].id;

  try {
    const { rows: ins } = await query<{ id: string }>(
      `INSERT INTO public.class_level_issues (class_id, topic, status, request_ids, raised_by)
       VALUES ($1, $2, 'open', $3, $4) RETURNING id`,
      [classId, topic, requestIds, actorId],
    );
    await query(
      `UPDATE public.class_requests SET parent_issue_id = $1 WHERE id = ANY($2::uuid[])`,
      [ins[0].id, requestIds],
    );
    await audit("class_issue.create", actorId, { targetId: ins[0].id, classId, topic, requestCount: requestIds.length });
    return ins[0].id;
  } catch (e) {
    // uq_class_level_issues_open race → already created
    const { rows: retried } = await query<{ id: string }>(
      `SELECT id FROM public.class_level_issues WHERE class_id = $1 AND topic = $2 AND status IN ('open','in_progress') LIMIT 1`,
      [classId, topic],
    );
    if (retried.length > 0) return retried[0].id;
    throw e;
  }
}

export async function resolveClassLevelIssue(issueId: string, actorId: string, resolution: string) {
  const { rows: issue } = await query<{ request_ids: string[]; class_id: string }>(
    `SELECT request_ids, class_id FROM public.class_level_issues WHERE id = $1`,
    [issueId],
  );
  if (issue.length === 0) throw new Error("Issue not found");

  await query(
    `UPDATE public.class_level_issues
        SET status = 'resolved', resolved_at = NOW(), resolved_by = $1, resolution = $2
      WHERE id = $3`,
    [actorId, resolution, issueId],
  );
  // Flip all linked requests to resolved
  if (issue[0].request_ids.length > 0) {
    await query(
      `UPDATE public.class_requests
          SET status = 'resolved', resolved_at = NOW(), resolution_note = $1
        WHERE id = ANY($2::uuid[])`,
      [resolution, issue[0].request_ids],
    );
  }
  await audit("class_issue.resolve", actorId, { targetId: issueId, resolution });
  return { id: issueId, status: "resolved" };
}

async function getHodForDept(dept: string): Promise<string | null> {
  const { rows } = await query<{ id: string }>(
    `SELECT u.id FROM public.users u
       JOIN public.user_roles ur ON ur.user_id = u.id
      WHERE ur.role = 'hod' AND ur.scope_type = 'department' AND ur.scope_id = $1
        AND u.status = 'active' LIMIT 1`,
    [dept],
  );
  return rows[0]?.id ?? null;
}

async function notifyHodOfUrgent(dept: string, body: string, requestId: string) {
  try {
    const { rows } = await query<{ id: string }>(
      `SELECT u.id FROM public.users u
         JOIN public.user_roles ur ON ur.user_id = u.id
        WHERE ur.role = 'hod' AND (ur.scope_type = 'department' AND ur.scope_id = $1
                                   OR ur.scope_type IS NULL)
          AND u.status = 'active'`,
      [dept],
    );
    for (const u of rows) {
      await notifyUser(u.id, "class_request_urgent", "Urgent class request", body, { request_id: requestId });
    }
  } catch {
    // best-effort
  }
}
