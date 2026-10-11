/**
 * Central role registry. Single source truth role identifiers.
 * Adding role: add key, add migration extend
 * public.users.role CHECK constraint insert public.config_roles_registry schema.
 */
export const ROLES = {
  OPERATOR: "operator",
  ADMIN: "admin",
  SYSADMIN: "sysadmin",
  SUPERVISOR: "supervisor",
  GUARDIAN: "guardian",
  PARENT: "parent",
  HOD: "hod",
  STUDENT: "student",
  WARDEN: "warden",
  FACULTY: "faculty",
  STAFF: "staff",
  WORKER: "worker",
  VISITOR: "visitor",
  CARETAKER: "caretaker",
  DEPUTY_WARDEN: "deputy_warden",
  HOSTEL_MANAGER: "hostel_manager",
  PRINCIPAL: "principal",
  VICE_PRINCIPAL: "vice_principal",
  OIE: "oie",
  EXAM_BRANCH: "exam_branch",
  EXAM_SUPERINTENDENT: "exam_superintendent",
};

export type RoleKey = keyof typeof ROLES;
export type Role = (typeof ROLES)[RoleKey];

/** Roles get admin MFA gate sysadmin-only API surface. */
export const PRIVILEGED_ROLES: readonly Role[] = [ROLES.SYSADMIN, ROLES.ADMIN];

/** Roles own /** Roles own /** Roles own /*e. */
/** Roles own /** Roles own /** Roles own /*e. */
ROLESS.SYSADMIN];

export function isPrivileged(role: stringexport function isPrivileged(role: stringexport function isPrivileged(role: srole as Rexport function functioexport function ole: strexport fdefined | export function{
  retur  retur  retur ER_ADMIN_ROLES.includes(role as Role);
}
