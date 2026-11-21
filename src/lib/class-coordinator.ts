// src/lib/class-coordinator.ts
// Class Coordinator capability kernel.
// A coordinator = a student with an active student_representatives row
// (scope_type='class'). A *capability*, not a role — the binding beats
// the role (teaching-capability rule).

import { query } from "@/lib/postgres";
import { logAuditEvent } from "@/lib/audit";

export interface Coordinator {
  id: string;
  studentId: string;
  scopeId: string; // classes.name for scope_type='class'
  status: string;
  appointmentType: string;
  validFrom: string;
  validTo: string;
  name?: string;
}

export function getActiveCoordinators(scopeId: string): Promise<Coordinator[]> {
  return query<Coordinator>(
    `SELECT r.id, r.student_id AS "studentId", r.scope_id AS "scopeId",
            r.status, COALESCE(r.appointment_type,'appointed') AS "appointmentType",
            r.valid_from::text AS "validFrom", r.valid_to::text AS "validTo",
            u.name
       FROM public.student_representatives r
       JOIN public.users u ON u.id = r.student_id
      WHERE r.scope_type = 'class' AND r.scope_id = $1
        AND r.status = 'active' AND r.valid_to >= CURRENT_DATE
      ORDER BY u.name`,
    [scopeId],
  ).then(r => r.rows);
}

// Can this user relay class_messages for the given class?
export async function canRelay(userId: string, scopeId: string): Promise<boolean> {
  const { rows } = await query<{ status: string }>(
    `SELECT r.status FROM public.student_representatives r
      WHERE r.student_id = $1 AND r.scope_type = 'class' AND r.scope_id = $2
        AND r.status = 'active' AND r.valid_to >= CURRENT_DATE LIMIT 1`,
    [userId, scopeId],
  );
  return rows.length > 0;
}

// Can this user collect concerns (raise class_requests with raised_by_rep=TRUE)?
export async function canCollect(userId: string, scopeId: string): Promise<boolean> {
  return canRelay(userId, scopeId); // same capability for v1
}

// Read-all-requests permission for a class (D3). Bounded to the class scope.
export async function canReadClassRequests(userId: string, classId: string): Promise<boolean> {
  // classId is uuid; coordinator rows key on classes.name — resolve.
  const { rows: cls } = await query<{ name: string }>(
    `SELECT name FROM public.classes WHERE id = $1::uuid LIMIT 1`,
    [classId],
  );
  if (cls.length === 0) return false;
  return canRelay(userId, cls[0].name);
}

export async function appointCoordinator(
  input: { studentId: string; scopeId: string; validTo: string; appointedById: string; appointedRole: string },
): Promise<{ id: string }> {
  // Enforce one active class-CR per class (v1, D6): demote any existing active row.
  await query(
    `UPDATE public.student_representatives
        SET status = 'revoked'
      WHERE scope_type = 'class' AND scope_id = $1 AND status = 'active'
        AND student_id <> $2`,
    [input.scopeId, input.studentId],
  );
  const { rows: ins } = await query<{ id: string }>(
    `INSERT INTO public.student_representatives
       (student_id, scope_type, scope_id, appointed_by, appointed_role,
        appointment_type, valid_from, valid_to, status)
     VALUES ($1, 'class', $2, $3, $4, 'appointed', CURRENT_DATE, $5, 'active')
     ON CONFLICT (student_id, scope_type, scope_id, valid_from)
     DO UPDATE SET status = 'active', appointed_by = $3, appointed_role = $4,
                   appointment_type = 'appointed', valid_to = $5
     RETURNING id`,
    [input.studentId, input.scopeId, input.appointedById, input.appointedRole, input.validTo],
  );
  await logAuditEvent({
    action: "coordinator.appoint",
    userId: input.appointedById,
    userName: "",
    userRole: input.appointedRole,
    details: { targetId: ins[0].id, studentId: input.studentId, scopeId: input.scopeId, validTo: input.validTo },
  });
  return { id: ins[0].id };
}

export async function revokeCoordinator(repId: string, actorId: string, reason: string): Promise<{ id: string }> {
  await query(
    `UPDATE public.student_representatives SET status = 'revoked' WHERE id = $1`,
    [repId],
  );
  await logAuditEvent({
    action: "coordinator.revoke",
    userId: actorId,
    userName: "",
    userRole: "",
    details: { targetId: repId, reason },
  });
  return { id: repId };
}

// Coordinator self-request for extension → pending_approvals maker-checker.
export async function requestCoordinatorExtension(
  repId: string, actorId: string, newValidTo: string,
): Promise<{ id: string }> {
  await query(
    `INSERT INTO public.pending_approvals
       (id, maker_id, action, resource, resource_id, payload, status, expires_at)
     VALUES (gen_random_uuid(), $1, 'coordinator_extend', 'student_representatives', $2, $3::jsonb, 'PENDING', NOW() + INTERVAL '7 days')`,
    [actorId, repId, JSON.stringify({ newValidTo })],
  );
  await logAuditEvent({
    action: "coordinator.extend_request",
    userId: actorId,
    userName: "",
    userRole: "student",
    details: { targetId: repId, newValidTo },
  });
  return { id: repId };
}
