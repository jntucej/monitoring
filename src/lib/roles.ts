/**
 * Central role registry. Single source of truth for role identifiers.
 * Adding a role = add its key here + add a DB migration to extend
 * public.users.role CHECK constraint + insert into public.config_roles_registry schema.
 */
export const ROLES = {
  OPERATOR:        "operator",
  ADMIN:           "admin",
  SYSADMIN:        "sysadmin",
  SUPERVISOR:      "supervisor",
  GUARDIAN:        "guardian",
  PARENT:          "parent",
  HOD:             "hod",
  STUDENT:         "student",
  WARDEN:          "warden",
  FACULTY:         "faculty",
  STAFF:           "staff",
  WORKER:          "worker",
  VISITOR:         "visitor",
  CARETAKER:       "caretaker",
  DEPUTY_WARDEN:   "deputy_warden",
  HOSTEL_MANAGER:  "hostel_manager",
  PRINCIPAL:       "principal",
  VICE_PRINCIPAL:  "vice_principal",
  OIE:             "oie",
  EXAM_BRANCH:     "exam_branch",
} as const;

/**
 * Authorization tiers used by withAuthorization() route wrappers.
 *
 * Never inline role arrays in route files — a single source of truth means a
 * future role addition (e.g. `vice_principal`) cannot accidentally receive
 * sysadmin-only surface just because a route forgot to be updated.
 */
export const ADMIN_OR_SYSADMIN = ["admin", "sysadmin"] as const;
export const SYSADMIN_ONLY     = ["sysadmin"]         as const;
export const APPROVER_TIER     = ["principal", "vice_principal", "exam_branch",
                                  "oie", "hostel_manager", "deputy_warden",
                                  "caretaker", "warden", "hod"] as const;


export type RoleKey = keyof typeof ROLES;
export type Role    = (typeof ROLES)[RoleKey];

/** Roles that get the admin MFA gate and sysadmin-only API surface. */
export const PRIVILEGED_ROLES: readonly Role[] = [ROLES.SYSADMIN, ROLES.ADMIN];

/** Roles that own the standalone (sysadmin) workspace. */
export const SUPER_ADMIN_ROLES: readonly Role[] = [ROLES.SYSADMIN];

export function isPrivileged(role: string | undefined | null): boolean {
  return !!role && PRIVILEGED_ROLES.includes(role as Role);
}
export function isSuperAdmin(role: string | undefined | null): boolean {
  return !!role && SUPER_ADMIN_ROLES.includes(role as Role);
}
