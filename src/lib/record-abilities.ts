/**
 * record-abilities — per-record, per-role capability resolver.
 *
 * The coarse "can this role inspect/act on this KIND?" gate lives in
 * `entity-access.ts`. This module is the FINE layer: given a specific
 * record (its current stage, status, and scope) and a specific viewer
 * (their role + department/hostel/gate scope), it returns a structured
 * "Event Action Plan":
 *
 *   { mode, roleReason, actions }
 *
 * so the same record (a pass ticket, a complaint, a gate/scan) renders a
 * purpose-built action bar + "why I'm here" banner for EACH role, instead
 * of one static button set.
 *
 * Design rules this module follows:
 *   - UI-side only. The API still enforces RBAC + stage checks as the
 *     source of truth. These resolvers decide what to SHOW, never what is
 *     actually permitted — the server can always return 403 on a write.
 *   - Pure functions. No React, no hooks — safe to call from drawers,
 *     pages, and server-adjacent client components alike.
 *   - Composes with entity-access.ts: it calls `canActOnEntity` /
 *     `getFullPageRoute` for the "deepest layer" pivot link rather than
 *     re-deriving routes.
 *
 * The four modes:
 *   "act"      — it's this role's turn; primary action buttons.
 *   "observe"  — upstream/downstream chain + context; override/escalate if allowed.
 *   "verify"   — operational execution/verification step (gate scan, field note).
 *   "readonly" — audit/report/context; no mutation.
 */

import { ROLES, type Role } from "@/lib/roles";
import { canActOnEntity, getFullPageRoute, type EntityKind } from "@/lib/entity-access";

/* ── record shapes ─────────────────────────────────────────────────────── */

/** A lifecycle/event record: a permission or pass ticket. */
export interface PermissionEventRecord {
  id: string;
  ticket_number: string;
  workflow_type: string;
  /** e.g. "faculty" | "hod" | "deputy_warden" | "hostel_manager" | "exam_branch" | "oie" | "vice_principal" | "principal". */
  current_stage: string;
  /** e.g. "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED" | "DELEGATED". */
  status: string;
  student_user_id?: string;
  hostel_scope?: string | null;
}

/** A complaint / maintenance event. */
export interface ComplaintEventRecord {
  id: string;
  complaint_number?: string;
  category?: string;
  /** "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ESCALATED". */
  status?: string;
  current_stage?: string;
  /** Who raised it (a student) — used to scope the self-service view. */
  raised_by_user_id?: string;
  /** Hostel scope the complaint is routed within. */
  hostel_scope?: string | null;
}

/** A gate or gate-scan event. */
export interface GateEventRecord {
  id: string;
  gate_code?: string;
  /** "IN" | "OUT" | "CURFEW". */
  direction?: string | null;
  /** "OPEN" | "CLOSED" | "LOCKDOWN" | "MAINTENANCE". */
  status?: string;
  /** The assigned gate's scope (hostel boys/girls). */
  hostel_scope?: string | null;
  /** The scan's student, when the record is a movement event. */
  student_user_id?: string;
}

/* ── viewer context ────────────────────────────────────────────────────── */

export interface ViewerContext {
  userId: string;
  role: Role | string;
  departmentId?: string | null;
  hostelScope?: string | null;
  assignedGateId?: string | null;
}

/* ── output shape ───────────────────────────────────────────────────────── */

export type ActionIntent = "primary" | "secondary" | "danger" | "pivot";

export interface RecordAction {
  id: string;
  label: string;
  intent: ActionIntent;
  /** Write target (endpoint). UI callers route through their mutation hook;
   *  the server is the source of truth. */
  endpoint?: string;
  /** Read-only pivot target (a page route). */
  href?: string;
  /** When true, the UI must capture a reason before submitting. */
  requiresReason?: boolean;
  /** Shown when the action is intentionally disabled for this viewer. */
  disabledReason?: string;
}

export interface RecordEventAbility {
  /** "act" | "observe" | "verify" | "readonly". */
  mode: "act" | "observe" | "verify" | "readonly";
  /** One line explaining WHY this role has this ability on THIS event. */
  roleReason: string;
  actions: RecordAction[];
}

/* ── helpers ────────────────────────────────────────────────────────────── */

function normStage(s: string | undefined | null): string {
  return (s ?? "").toLowerCase().replace(/[\s-]+/g, "_");
}

function normStatus(s: string | undefined | null): string {
  return (s ?? "").toUpperCase();
}

/**
 * Build a viewer from the current auth store role + a partial workspace
 * context. Used by drawers/pages that already know the role but need a
 * ViewerContext for the resolver. Pure so it can be called in any scope.
 */
export function makeViewer(
  role: Role | string | null | undefined,
  partial?: Partial<Omit<ViewerContext, "role">>,
): ViewerContext {
  return {
    userId: partial?.userId ?? "",
    role: role ?? "",
    departmentId: partial?.departmentId ?? null,
    hostelScope: partial?.hostelScope ?? null,
    assignedGateId: partial?.assignedGateId ?? null,
  };
}

/* ── 1. Permission / Pass / Clearance events ───────────────────────────── */

/** Which roles own which approval stage (the "it's your turn" map). */
const PERMISSION_STAGE_OWNERS: Record<string, string[]> = {
  faculty: [ROLES.FACULTY],
  hod: [ROLES.HOD],
  deputy_warden: [ROLES.DEPUTY_WARDEN],
  hostel_manager: [ROLES.HOSTEL_MANAGER, ROLES.CARETAKER],
  caretaker: [ROLES.CARETAKER],
  exam_branch: [ROLES.EXAM_BRANCH],
  oie: [ROLES.OIE, ROLES.EXAM_SUPERINTENDENT],
  exam_superintendent: [ROLES.EXAM_SUPERINTENDENT],
  vice_principal: [ROLES.VICE_PRINCIPAL],
  principal: [ROLES.PRINCIPAL],
};

/** Roles that get executive override on a pending ticket. */
const EXEC_OVERRIDERS: Role[] = [
  ROLES.VICE_PRINCIPAL,
  ROLES.PRINCIPAL,
  ROLES.SUPERVISOR,
  ROLES.ADMIN,
];

/**
 * Resolve the role-specific ability for a permission / pass / clearance
 * record.
 */
export function resolvePermissionAbility(
  record: PermissionEventRecord,
  viewer: ViewerContext,
): RecordEventAbility {
  const role = String(viewer.role);
  const stage = normStage(record.current_stage);
  const status = normStatus(record.status);
  const isPending = status === "PENDING" || status === "ESCALATED" || status === "OVERDUE";

  // ── Level 0: self-service ──────────────────────────────────────────────
  if (role === ROLES.STUDENT || role === ROLES.PARENT || role === ROLES.GUARDIAN) {
    const isSelf =
      viewer.userId !== "" &&
      record.student_user_id &&
      String(record.student_user_id) === String(viewer.userId);
    const reason =
      role === ROLES.GUARDIAN
        ? "Guardian view for your ward's pass/leave request."
        : isSelf
          ? "You are the requester tracking your own pass/permission lifecycle."
          : "You are viewing a pass request.";
    const actions: RecordAction[] = [
      {
        id: "view-timeline",
        label: "Track Approval Timeline",
        intent: "pivot",
        href: getFullPageRoute(role, "ticket", record.id) ?? `/permissions/${record.id}`,
      },
    ];
    if (status === "APPROVED") {
      actions.unshift({
        id: "open-qr",
        label: "Show Gate Pass / QR",
        intent: "primary",
        href: role === ROLES.STUDENT ? "/student/passes" : "/permissions",
      });
    }
    if (isSelf && isPending) {
      actions.push({
        id: "withdraw",
        label: "Withdraw Request",
        intent: "danger",
        endpoint: `/api/permissions/${record.ticket_number}/withdraw`,
        requiresReason: true,
      });
    }
    return { mode: "readonly", roleReason: reason, actions };
  }

  // ── Level 1: gate operator (verify, never approve policy) ─────────────
  if (role === ROLES.OPERATOR) {
    const gateHref = viewer.assignedGateId
      ? `/gate/${viewer.assignedGateId}`
      : "/operator";
    return {
      mode: "verify",
      roleReason: "Gate operator verifies pass validity and executes the IN/OUT scan at the gate.",
      actions: [
        {
          id: "go-gate-desk",
          label: "Open Gate Scan Desk",
          intent: "primary",
          href: gateHref,
        },
        {
          id: "view-ticket",
          label: "View Ticket Details",
          intent: "pivot",
          href: `/permissions/${record.id}`,
        },
      ],
    };
  }

  // ── Level 2: stage-based approvers ────────────────────────────────────
  const ownsCurrentStage = (PERMISSION_STAGE_OWNERS[stage] ?? []).includes(role);
  if (isPending && ownsCurrentStage) {
    const actEndpoint = `/api/permissions/${record.ticket_number}`;
    const approveLabel =
      stage === "exam_branch"
        ? "Verify & Send to OIE"
        : stage === "oie"
          ? "Approve Exam Clearance"
          : "Approve Stage";
    return {
      mode: "act",
      roleReason: `This event is at the "${record.current_stage}" stage, which is assigned to your role.`,
      actions: [
        { id: "approve", label: approveLabel, intent: "primary", endpoint: actEndpoint },
        { id: "forward", label: "Forward to Next Stage", intent: "secondary", endpoint: actEndpoint },
        {
          id: "reject",
          label: "Reject",
          intent: "danger",
          endpoint: actEndpoint,
          requiresReason: true,
        },
        { id: "full-ticket", label: "Open Full Ticket", intent: "pivot", href: `/permissions/${record.id}` },
      ],
    };
  }

  // ── Level 3: executive / admin oversight ──────────────────────────────
  if (EXEC_OVERRIDERS.includes(role as Role)) {
    if (isPending) {
      const actEndpoint = `/api/permissions/${record.ticket_number}`;
      return {
        mode: "act",
        roleReason: `Executive oversight: the event is at "${record.current_stage}" — you can review the chain or intervene.`,
        actions: [
          { id: "override-approve", label: "Approve / Override", intent: "primary", endpoint: actEndpoint },
          { id: "escalate", label: "Escalate", intent: "secondary", endpoint: `${actEndpoint}/escalate` },
          { id: "full-ticket", label: "Open Full Ticket", intent: "pivot", href: `/permissions/${record.id}` },
        ],
      };
    }
    return {
      mode: "observe",
      roleReason: `Completed event (${record.status}) — available for governance and audit review.`,
      actions: [
        { id: "full-ticket", label: "Open Full Ticket", intent: "pivot", href: `/permissions/${record.id}` },
        { id: "audit", label: "Trace in Audit Logs", intent: "pivot", href: "/sysadmin/audit" },
      ],
    };
  }

  // ── Level 4: sysadmin diagnostic lens ─────────────────────────────────
  if (role === ROLES.SYSADMIN) {
    return {
      mode: "observe",
      roleReason: "System administrator diagnostic view: inspect workflow state, audit trail, and linked sessions.",
      actions: [
        { id: "full-ticket", label: "Inspect Ticket Payload", intent: "pivot", href: `/permissions/${record.id}` },
        { id: "audit-trail", label: "Trace in Audit Logs", intent: "pivot", href: "/sysadmin/audit" },
      ],
    };
  }

  // ── Default: observing approvers / staff outside their active stage ───
  return {
    mode: "observe",
    roleReason: `Event is at stage "${record.current_stage}" (${record.status}) — not your active step.`,
    actions: [
      { id: "view-ticket", label: "View Ticket Details", intent: "pivot", href: `/permissions/${record.id}` },
    ],
  };
}

/* ── 2. Complaint / maintenance events ─────────────────────────────────── */

/** Roles that can update complaint status / add field notes (within scope). */
const COMPLAINT_HANDLERS: Role[] = [
  ROLES.CARETAKER,
  ROLES.WORKER,
  ROLES.EMO,
  ROLES.HOSTEL_MANAGER,
];

/**
 * Resolve the role-specific ability for a complaint / maintenance event.
 */
export function resolveComplaintAbility(
  record: ComplaintEventRecord,
  viewer: ViewerContext,
): RecordEventAbility {
  const role = String(viewer.role);
  const status = normStatus(record.status);
  const isOpen = status === "OPEN" || status === "IN_PROGRESS" || status === "ESCALATED";

  // Self-service: the student who raised it tracks / escalates.
  if (role === ROLES.STUDENT || role === ROLES.PARENT || role === ROLES.GUARDIAN) {
    const isSelf =
      viewer.userId !== "" &&
      record.raised_by_user_id &&
      String(record.raised_by_user_id) === String(viewer.userId);
    const actions: RecordAction[] = [
      {
        id: "view-complaint",
        label: "View Complaint Status",
        intent: "pivot",
        href:
          getFullPageRoute(role, "complaint", record.id) ??
          (role === ROLES.STUDENT ? `/student/complaints/${record.id}` : `/complaints/${record.id}`),
      },
    ];
    if (isSelf && isOpen) {
      actions.push({
        id: "escalate",
        label: "Escalate Complaint",
        intent: "primary",
        endpoint: `/api/complaints/${record.id}/escalate`,
        requiresReason: true,
      });
    }
    return {
      mode: "readonly",
      roleReason: isSelf
        ? "You raised this complaint — track its progress or escalate it."
        : "You are viewing a complaint.",
      actions,
    };
  }

  // Operational handlers: update status / add field notes within hostel scope.
  if (COMPLAINT_HANDLERS.includes(role as Role)) {
    // Scope guard: a handler in a different hostel scope cannot act.
    const inScope =
      !record.hostel_scope ||
      !viewer.hostelScope ||
      record.hostel_scope === viewer.hostelScope;
    if (inScope && isOpen) {
      return {
        mode: "act",
        roleReason: `This complaint is open and within your ${record.hostel_scope ?? "assigned"} scope — you can add field notes or update its status.`,
        actions: [
          { id: "add-note", label: "Add Field Note", intent: "primary", endpoint: `/api/complaints/${record.id}/notes`, requiresReason: true },
          { id: "resolve", label: "Mark Resolved", intent: "primary", endpoint: `/api/complaints/${record.id}/resolve` },
          { id: "view", label: "Open Complaint", intent: "pivot", href: getFullPageRoute(role, "complaint", record.id) ?? `/complaints/${record.id}` },
        ],
      };
    }
    return {
      mode: "observe",
      roleReason: inScope
        ? `Complaint is ${status || "closed"} — out of your active step.`
        : `Complaint is in "${record.hostel_scope}" scope; you are scoped to "${viewer.hostelScope ?? "campus-wide"}".`,
      actions: [
        { id: "view", label: "View Complaint", intent: "pivot", href: getFullPageRoute(role, "complaint", record.id) ?? `/complaints/${record.id}` },
      ],
    };
  }

  // Executive / admin oversight.
  if (EXEC_OVERRIDERS.includes(role as Role) || role === ROLES.SYSADMIN) {
    return {
      mode: role === ROLES.SYSADMIN ? "observe" : isOpen ? "act" : "observe",
      roleReason:
        role === ROLES.SYSADMIN
          ? "System administrator diagnostic view of the complaint lifecycle."
          : isOpen
            ? "Executive oversight: you can review the chain or intervene on an open complaint."
            : "Closed complaint — available for audit review.",
      actions: [
        ...(isOpen && role !== ROLES.SYSADMIN
          ? [
              { id: "override-resolve", label: "Resolve / Override", intent: "primary" as const, endpoint: `/api/complaints/${record.id}/resolve` },
              { id: "escalate", label: "Escalate", intent: "secondary" as const, endpoint: `/api/complaints/${record.id}/escalate` },
            ]
          : []),
        { id: "view", label: "Open Complaint", intent: "pivot", href: getFullPageRoute(role, "complaint", record.id) ?? `/complaints/${record.id}` },
      ],
    };
  }

  // Default observer.
  return {
    mode: "observe",
    roleReason: `Complaint is ${status || "in progress"} (${record.category ?? "uncategorized"}).`,
    actions: [
      { id: "view", label: "View Complaint", intent: "pivot", href: `/complaints/${record.id}` },
    ],
  };
}

/* ── 3. Gate / scan events ──────────────────────────────────────────────── */

/**
 * Resolve the role-specific ability for a gate / gate-scan event.
 */
export function resolveGateEventAbility(
  record: GateEventRecord,
  viewer: ViewerContext,
): RecordEventAbility {
  const role = String(viewer.role);
  const status = normStatus(record.status);
  const isOperational = status === "OPEN" || status === "LOCKDOWN";

  // Gate operator: focused on IN/OUT scanning at their assigned gate.
  if (role === ROLES.OPERATOR) {
    const gateHref = record.gate_code
      ? `/gate/${record.gate_code}`
      : viewer.assignedGateId
        ? `/gate/${viewer.assignedGateId}`
        : "/operator";
    return {
      mode: "verify",
      roleReason: "Gate operator handles the IN/OUT scan at their assigned gate.",
      actions: [
        { id: "gate-desk", label: "Open Gate Scan Desk", intent: "primary", href: gateHref },
        {
          id: "log-movement",
          label: "Record Movement",
          intent: "secondary",
          endpoint: `/api/gates/${record.id}/movement`,
          disabledReason: status === "LOCKDOWN" ? "Gate is in lockdown — no movements" : undefined,
        },
      ],
    };
  }

  // Supervisor / deputy warden: curfew, exceptions, shift handovers.
  if (role === ROLES.SUPERVISOR || role === ROLES.DEPUTY_WARDEN) {
    return {
      mode: isOperational ? "act" : "observe",
      roleReason: isOperational
        ? `Gate "${record.gate_code ?? record.id}" is ${status} — you can manage curfew, exceptions, and shift handover.`
        : `Gate "${record.gate_code ?? record.id}" is ${status || "idle"} — available for review.`,
      actions: [
        { id: "curfew", label: "Manage Curfew", intent: "primary", endpoint: `/api/gates/${record.id}/curfew` },
        { id: "exceptions", label: "Review Exceptions", intent: "secondary", href: "/supervisor/response/exceptions" },
        { id: "handover", label: "Shift Handover", intent: "secondary", href: "/supervisor/shift/handover" },
      ],
    };
  }

  // Admin / sysadmin: gate mode, devices, and health.
  if (role === ROLES.ADMIN || role === ROLES.SYSADMIN) {
    const gateRoute = getFullPageRoute(role, "gate", record.id);
    return {
      mode: "act",
      roleReason: `${role} manages gate mode, device configuration, and operational health.`,
      actions: [
        { id: "set-mode", label: "Set Gate Mode", intent: "primary", endpoint: `/api/admin/gates/${record.id}/mode` },
        { id: "devices", label: "Device Configuration", intent: "secondary", href: "/admin/gate-device-configuration" },
        { id: "health", label: "Gate Health", intent: "secondary", href: "/admin/gates" },
        ...(gateRoute ? [{ id: "full-gate", label: "Open Full Gate Record", intent: "pivot" as const, href: gateRoute }] : []),
      ],
    };
  }

  // Default observer (hostel manager viewing a gate in their scope, etc.).
  return {
    mode: "observe",
    roleReason: `Gate "${record.gate_code ?? record.id}" is ${status || "in a normal state"} — view-only for your role.`,
    actions: [
      {
        id: "view-gate",
        label: "View Gate",
        intent: "pivot",
        href: getFullPageRoute(role, "gate", record.id) ?? `/gate/${record.gate_code ?? record.id}`,
      },
    ],
  };
}

/* ── convenience: pick the right resolver by record kind ───────────────── */

export type AnyEventRecord =
  | { __kind: "permission"; record: PermissionEventRecord }
  | { __kind: "complaint"; record: ComplaintEventRecord }
  | { __kind: "gate"; record: GateEventRecord };

export function resolveEventAbility(
  kind: EntityKind | string,
  wrapped: AnyEventRecord,
  viewer: ViewerContext,
): RecordEventAbility {
  switch (kind) {
    case "ticket":
    case "permission":
      return resolvePermissionAbility((wrapped as { record: PermissionEventRecord }).record, viewer);
    case "complaint":
      return resolveComplaintAbility((wrapped as { record: ComplaintEventRecord }).record, viewer);
    case "gate":
    case "scan":
      return resolveGateEventAbility((wrapped as { record: GateEventRecord }).record, viewer);
    default:
      // Unknown kind: fall back to the coarse canActOnEntity decision.
      const canAct = canActOnEntity(kind as EntityKind, viewer.role);
      return {
        mode: canAct ? "act" : "readonly",
        roleReason: canAct
          ? "You can act on this record."
          : "View-only access for this record.",
        actions: [],
      };
  }
}
