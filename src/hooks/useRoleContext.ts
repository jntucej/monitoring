"use client";

import { useAuthStore } from "@/stores/authStore";
import { ROLES, type Role } from "@/lib/roles";

/**
 * useRoleContext — read the current viewer's role + workspace context
 * without the ticket machinery. This is what an inspection panel needs
 * to filter its *Actions* section per role ("role-appropriate depth"):
 * the Principal sees act/resolve/delegate buttons; an Operator sees
 * read-only context; a Student sees nothing but their own record.
 */

export interface RoleContextResult {
  role: Role | null;
  userId: string | null;
  /** True for the top tier of the institution (the warden = Principal). */
  isPrincipal: boolean;
  /** True for faculty-level roles that can act within their department. */
  isFaculty: boolean;
  /** True for operational roles (operators, gate staff) — read-only. */
  isOperator: boolean;
  /** True for student/guardian self-service roles. */
  isSelfService: boolean;
}

const PRINCIPAL_ROLES: Role[] = [ROLES.PRINCIPAL, ROLES.CHIEF_WARDEN];
const FACULTY_ROLES: Role[] = [
  ROLES.VICE_PRINCIPAL,
  ROLES.OIE,
  ROLES.EXAM_SUPERINTENDENT,
  ROLES.EXAM_BRANCH,
  ROLES.CONTROLLER_EXAMS,
  ROLES.ADDL_CTRL_ACADEMIC,
  ROLES.ADDL_CTRL_RESULTS,
  ROLES.DEAN,
  ROLES.DEPUTY_WARDEN,
];
const OPERATOR_ROLES: Role[] = [
  ROLES.CARETAKER,
  ROLES.MESS_INCHARGE,
  ROLES.EMO,
  ROLES.WORKER,
  ROLES.STAFF,
  ROLES.HOSTEL_MANAGER,
];
const SELF_SERVICE_ROLES: Role[] = [
  ROLES.STUDENT,
  ROLES.PARENT,
  ROLES.VISITOR,
];

export function useRoleContext(): RoleContextResult {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);

  const r = role as Role | undefined;
  return {
    role: r ?? null,
    userId: user?.id ?? null,
    isPrincipal: PRINCIPAL_ROLES.includes(r as Role),
    isFaculty: FACULTY_ROLES.includes(r as Role),
    isOperator: OPERATOR_ROLES.includes(r as Role),
    isSelfService: SELF_SERVICE_ROLES.includes(r as Role),
  };
}
