/**
 * entity-access — centralized UI-side access/capability map for role-gated
 * entity inspection.
 *
 * This module is UI-side only. The API still enforces its own RBAC
 * (defense in depth) — these helpers only decide what to *show* and which
 * "deepest layer" page link to attach to a chip.
 *
 * Follows the tiered model from
 * docs/plan/institutional/PR-05A-interaction-coverage-AUDIT.md.
 */

import { type Role, ROLES } from "@/lib/roles";

export type EntityKind =
  | "student"
  | "faculty"
  | "gate"
  | "ticket"
  | "complaint"
  | "device"
  | "case"
  | "alert";

/** Roles that may *inspect* each entity kind. */
export const ENTITY_ACCESS: Record<EntityKind, readonly Role[]> = {
  student: [
    ROLES.FACULTY,
    ROLES.HOD,
    ROLES.DEPUTY_WARDEN,
    ROLES.HOSTEL_MANAGER,
    ROLES.VICE_PRINCIPAL,
    ROLES.PRINCIPAL,
    ROLES.SUPERVISOR,
    ROLES.ADMIN,
    ROLES.SYSADMIN,
  ],
  faculty: [
    ROLES.HOD,
    ROLES.VICE_PRINCIPAL,
    ROLES.PRINCIPAL,
    ROLES.ADMIN,
    ROLES.SYSADMIN,
  ],
  gate: [
    ROLES.OPERATOR,
    ROLES.SUPERVISOR,
    ROLES.DEPUTY_WARDEN,
    ROLES.VICE_PRINCIPAL,
    ROLES.PRINCIPAL,
    ROLES.ADMIN,
    ROLES.SYSADMIN,
  ],
  ticket: [
    ROLES.STUDENT,
    ROLES.GUARDIAN,
    ROLES.OPERATOR,
    ROLES.FACULTY,
    ROLES.HOD,
    ROLES.DEPUTY_WARDEN,
    ROLES.HOSTEL_MANAGER,
    ROLES.EXAM_BRANCH,
    ROLES.OIE,
    ROLES.VICE_PRINCIPAL,
    ROLES.PRINCIPAL,
    ROLES.SUPERVISOR,
    ROLES.ADMIN,
    ROLES.SYSADMIN,
  ],
  complaint: [
    ROLES.STUDENT,
    ROLES.CARETAKER,
    ROLES.EMO,
    ROLES.HOSTEL_MANAGER,
    ROLES.DEPUTY_WARDEN,
    ROLES.PRINCIPAL,
    ROLES.ADMIN,
    ROLES.SYSADMIN,
  ],
  device: [ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.SYSADMIN],
  case: [
    ROLES.VICE_PRINCIPAL,
    ROLES.PRINCIPAL,
    ROLES.ADMIN,
    ROLES.SYSADMIN,
  ],
  alert: [ROLES.ADMIN, ROLES.SYSADMIN, ROLES.SUPERVISOR],
};

/**
 * Whether the given role may inspect the entity of the given kind.
 *
 * - nullish role → false (no role = no access).
 * - Unknown kind (e.g. a resolver-registered kind not in ENTITY_ACCESS) →
 *   true only if role is sysadmin or admin; otherwise false.
 */
export function canInspectEntity(
  role: Role | string | undefined | null,
  kind: EntityKind,
): boolean {
  if (!role) return false;
  const allowed = ENTITY_ACCESS[kind];
  if (allowed === undefined) {
    // Unknown kind: privileged fallback only.
    return role === ROLES.SYSADMIN || role === ROLES.ADMIN;
  }
  return allowed.includes(role as Role);
}

/**
 * ENTITY_ACTION — the UI-side "can this role act on a record of this kind?"
 * capability map. Separate from ENTITY_ACCESS: inspection is read-only
 * (view the drawer / timeline); acting is a write (approve, reject,
 * forward, mark corrected, check-in/out, escalate, resolve).
 *
 * admin / sysadmin are always in the action allowlist (privileged fallback
 * below, mirroring canInspectEntity).
 *
 * Used by the inspector's "Actions" section to *hide* (not disable) the
 * action bar when the role is not in the allowlist.
 */
export const ENTITY_ACTION: Record<EntityKind, readonly Role[]> = {
  student: [
    ROLES.FACULTY,
    ROLES.HOD,
    ROLES.DEPUTY_WARDEN,
    ROLES.HOSTEL_MANAGER,
    ROLES.VICE_PRINCIPAL,
    ROLES.PRINCIPAL,
    ROLES.SUPERVISOR,
    ROLES.ADMIN,
    ROLES.SYSADMIN,
  ],
  faculty: [
    ROLES.HOD,
    ROLES.VICE_PRINCIPAL,
    ROLES.PRINCIPAL,
    ROLES.ADMIN,
    ROLES.SYSADMIN,
  ],
  gate: [
    ROLES.OPERATOR,
    ROLES.SUPERVISOR,
    ROLES.DEPUTY_WARDEN,
    ROLES.VICE_PRINCIPAL,
    ROLES.PRINCIPAL,
    ROLES.ADMIN,
    ROLES.SYSADMIN,
  ],
  ticket: [
    ROLES.STUDENT,
    ROLES.GUARDIAN,
    ROLES.FACULTY,
    ROLES.HOD,
    ROLES.DEPUTY_WARDEN,
    ROLES.HOSTEL_MANAGER,
    ROLES.EXAM_BRANCH,
    ROLES.OIE,
    ROLES.VICE_PRINCIPAL,
    ROLES.PRINCIPAL,
    ROLES.SUPERVISOR,
    ROLES.ADMIN,
    ROLES.SYSADMIN,
  ],
  complaint: [
    ROLES.STUDENT,
    ROLES.CARETAKER,
    ROLES.EMO,
    ROLES.HOSTEL_MANAGER,
    ROLES.DEPUTY_WARDEN,
    ROLES.PRINCIPAL,
    ROLES.ADMIN,
    ROLES.SYSADMIN,
  ],
  device: [ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.SYSADMIN],
  case: [ROLES.VICE_PRINCIPAL, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.SYSADMIN],
  alert: [ROLES.ADMIN, ROLES.SYSADMIN, ROLES.SUPERVISOR],
};

/**
 * Whether the given role may act on the entity of the given kind.
 *
 * - nullish role → false.
 * - admin / sysadmin → always true (privileged fallback, same as inspect).
 * - Unknown kind (e.g. a resolver-registered kind not in ENTITY_ACTION,
 *   such as "visitor" / "exception" / "scan" / "notification" used by
 *   inspectionModels.tsx) → true only if role is sysadmin or admin;
 *   otherwise false. The caller can widen the allowlist by extending the
 *   EntityKind union + the map.
 */
export function canActOnEntity(
  kind: EntityKind,
  role: Role | string | undefined | null,
): boolean {
  if (!role) return false;
  if (role === ROLES.SYSADMIN || role === ROLES.ADMIN) return true;
  const allowed = ENTITY_ACTION[kind];
  if (allowed === undefined) {
    // Unknown kind: privileged fallback only. (admin / sysadmin already
    // returned true above; reach here means an unknown kind + non-privileged
    // role → false.)
    return false;
  }
  return allowed.includes(role as Role);
}

/**
 * Resolve the "deepest layer" page route for a role/kind/id combo.
 *
 * Returns null when no role-appropriate full page exists for this entity —
 * the caller should then omit the external-link affordance on the chip.
 */
export function getFullPageRoute(
  role: Role | string | undefined | null,
  kind: EntityKind,
  id: string,
): string | null {
  if (!role || !id) return null;

  switch (kind) {
    case "ticket": {
      // student and guardian both have a /student/passes/[ticket] view;
      // the approver suite resolves to /permissions/[ticket].
      if (role === ROLES.STUDENT) return `/student/passes/${id}`;
      if (role === ROLES.GUARDIAN) return `/permissions/${id}`;
      return `/permissions/${id}`;
    }
    case "complaint": {
      const approverComplaintRoles: Role[] = [
        ROLES.CARETAKER,
        ROLES.DEPUTY_WARDEN,
        ROLES.EMO,
        ROLES.HOSTEL_MANAGER,
      ];
      if (approverComplaintRoles.includes(role as Role)) {
        return `/${role}/complaints/${id}`;
      }
      if (role === ROLES.STUDENT) return `/student/complaints/${id}`;
      return null;
    }
    case "student": {
      if (role === ROLES.ADMIN || role === ROLES.SYSADMIN) {
        return `/admin/students/${id}`;
      }
      return null;
    }
    case "faculty": {
      if (role === ROLES.ADMIN || role === ROLES.SYSADMIN) {
        return `/admin/faculty/${id}`;
      }
      return null;
    }
    case "gate": {
      if (role === ROLES.ADMIN || role === ROLES.SYSADMIN) {
        return `/admin/gates/${id}`;
      }
      return null;
    }
    case "case": {
      if (role === ROLES.PRINCIPAL) return `/principal/cases/${id}`;
      return null;
    }
    case "device":
    case "alert":
      return null;
    default:
      return null;
  }
}
