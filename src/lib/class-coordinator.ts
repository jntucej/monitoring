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
  representativeType: string; // CR | ICR
  constituency: string | null; // BOYS | GIRLS | null(ANY)
  validFrom: string;
  validTo: string;
  name?: string;
}

export function getActiveCoordinators(scopeId: string): Promise<Coordinator[]> {
  return query<Coordinator>(
    `SELECT r.id, r.student_id AS "studentId", r.scope_id AS "scopeId",
            r.status, COALESCE(r.appointment_type,'appointed') AS "appointmentType",
            COALESCE(r.representative_type,'CR') AS "representativeType",
            r.constituency,
            r.valid_from::text AS "validFrom", r.valid_to::text AS "validTo",
            u.name
       FROM public.student_representatives r
       JOIN public.users u ON u.id = r.student_id
      WHERE r.scope_type = 'class' AND r.scope_id = $1
        AND r.status = 'active' AND r.valid_to >= CURRENT_DATE
      ORDER BY r.representative_type, r.constituency NULLS FIRST, u.name`,
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

// P2 — "communication ≠ authority". A coordinator may relay notices and
// represent the class, but NEVER gain academic authority: no grading, no
// modifying records, no resolving another student's request. This capability
// is deliberately false for coordinators so the boundary is explicit and
// auditable — the binding grants *communication* power, not *decision* power.
export async function canModifyAcademicRecords(userId: string, scopeId: string): Promise<boolean> {
  // A coordinator row existing proves representation power only. Authority to
  // modify records / grade / resolve others' requests is held by faculty,
  // HOD, VP, Principal (per escalation-ladder) — never by a student rep.
  const { rows: isRep } = await query<{ n: number }>(
    `SELECT 1 AS n FROM public.student_representatives
      WHERE student_id = $1 AND scope_type = 'class' AND scope_id = $2
        AND status = 'active' AND valid_to >= CURRENT_DATE LIMIT 1`,
    [userId, scopeId],
  );
  if (isRep.length > 0) return false; // coordinator: communication only
  return false; // v1: no one else claims record-modify power from this kernel
}

// Read-class-level-visibility permission for a class (P5). The class token may
// be a classes.uuid OR a department code (classes table is empty in this
// dataset), so resolve the coordinator's scope against either, then gate on the
// active student_representatives row.
export async function canReadClassRequests(userId: string, classId: string): Promise<boolean> {
  // Regex-guard the uuid cast: 'EEE' is a dept code, not a uuid — a bare
  // `$1::uuid` would throw "invalid input syntax". Match the uuid-or-dept
  // pattern used across the owner-queue joins.
  const { rows: cls } = await query<{ name: string }>(
    `SELECT name FROM public.classes
       WHERE ($1 ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND id = $1::uuid)
          OR department_id = $1
       LIMIT 1`,
    [classId],
  );
  if (cls.length > 0) return canRelay(userId, cls[0].name);
  // No class row (empty classes table): a coordinator row scoped to the raw
  // token (dept code stored as scope_id) counts.
  return canRelay(userId, classId);
}

export async function appointCoordinator(
  input: {
    studentId: string;
    scopeId: string;
    validTo: string;
    appointedById: string;
    appointedRole: string;
    representativeType?: "CR" | "ICR";
    constituency?: "BOYS" | "GIRLS" | null;
  },
): Promise<{ id: string }> {
  const repType = input.representativeType ?? "CR";
  const constituency = input.constituency ?? null;
  // 4-rep model: demote only the OTHER active rep in the SAME cell
  // (same class, same type, same constituency). Other cells (the other 3 of
  // the 4) are untouched so a class can hold up to CR/ICR × Boys/Girls.
  await query(
    `UPDATE public.student_representatives
        SET status = 'revoked'
      WHERE scope_type = 'class' AND scope_id = $1 AND status = 'active'
        AND representative_type = $2
        AND (COALESCE(constituency,'ANY') = COALESCE($3::text,'ANY'))
        AND student_id <> $4`,
    [input.scopeId, repType, constituency, input.studentId],
  );
  const { rows: ins } = await query<{ id: string }>(
    `INSERT INTO public.student_representatives
       (student_id, scope_type, scope_id, appointed_by, appointed_role,
        appointment_type, valid_from, valid_to, status,
        representative_type, constituency)
     VALUES ($1, 'class', $2, $3, $4, 'appointed', CURRENT_DATE, $5, 'active', $6, $7)
     ON CONFLICT (student_id, scope_type, scope_id, valid_from)
     DO UPDATE SET status = 'active', appointed_by = $3, appointed_role = $4,
                   appointment_type = 'appointed', valid_to = $5,
                   representative_type = $6, constituency = $7
     RETURNING id`,
    [input.studentId, input.scopeId, input.appointedById, input.appointedRole, input.validTo, repType, constituency],
  );
  await logAuditEvent({
    action: "coordinator.appoint",
    userId: input.appointedById,
    userName: "",
    userRole: input.appointedRole,
    details: { targetId: ins[0].id, studentId: input.studentId, scopeId: input.scopeId, validTo: input.validTo, representativeType: repType, constituency: constituency ?? "ANY" },
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
