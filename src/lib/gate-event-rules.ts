/**
 * gate-event-rules — role-specific capability rulesets for a Gate / Scan Event.
 *
 * Mirrors the tier structure of `pass-ticket-rules.ts`:
 *   Tier 0 — student / guardian (read-only reference)
 *   Tier 1 — operator (IN/OUT scanning at their assigned gate)
 *   Tier 2 — supervisor / deputy_warden (curfew, exceptions, shift handover)
 *   Tier 3 — admin / sysadmin (gate mode, devices, health)
 *
 * The coarse "can this role inspect/act?" gate lives in entity-access.ts.
 * This module is the fine layer: it returns which sections and action buttons
 * a specific role sees for a specific gate event.
 */

import { ROLES, type Role } from "@/lib/roles";

/* ── public shapes ───────────────────────────────────────────────────────── */

export type GateEventAbilityMode =
  | "reference-readonly"  // student / guardian
  | "gate-verify"         // operator scanning at their gate
  | "gate-act"            // supervisor managing curfew / exceptions / handover
  | "gate-admin"          // admin / sysadmin managing devices & health
  | "gate-observe";       // all other roles

export interface GateEventActionSpec {
  id: string;
  label: string;
  tone: "primary" | "secondary" | "danger" | "link";
  href?: string;
  apiMethod?: "PATCH" | "POST";
  apiAction?:
    | "scan-in"
    | "scan-out"
    | "log-movement"
    | "curfew"
    | "exceptions"
    | "handover"
    | "set-mode"
    | "view-devices";
  requiresNote?: boolean;
}

export interface GateEventRuleSet {
  tierLabel: string;
  mode: GateEventAbilityMode;
  whyRoleIsHere: string;
  visibleSections: Array<
    "gate-status" | "scan-log" | "curfew" | "exceptions" | "shift-handover" | "devices" | "sla" | "audit"
  >;
  actions: GateEventActionSpec[];
}

export interface GateEventSnapshot {
  id: string;
  gateCode?: string;
  gateName?: string;
  /** "IN" | "OUT" | "CURFEW" | null */
  direction?: string | null;
  /** "OPEN" | "CLOSED" | "LOCKDOWN" | "MAINTENANCE" */
  status: string;
  hostelScope?: string | null;
  studentUserId?: string;
  studentRoll?: string;
  scanTimestamp?: string | null;
}

export interface GateEventViewerContext {
  role: Role | string;
  userId?: string;
  hostelScope?: string | null;
  assignedGateId?: string | null;
}

/* ── resolver ─────────────────────────────────────────────────────────────── */

const GATE_TIER2_ROLES: string[] = [
  ROLES.DEPUTY_WARDEN,
  ROLES.HOSTEL_MANAGER,
  ROLES.EXAM_SUPERINTENDENT,
];

const GATE_ADMIN_ROLES: string[] = [
  ROLES.SUPERVISOR,
  ROLES.PRINCIPAL,
  ROLES.ADMIN,
  ROLES.SYSADMIN,
];

export function getGateEventRulesForRole(
  viewer: GateEventViewerContext,
  gate: GateEventSnapshot,
): GateEventRuleSet {
  const r = String(viewer.role).toLowerCase();
  const status = gate.status.toUpperCase();
  const isOperational = status === "OPEN" || status === "LOCKDOWN";

  // ── Tier 0A: Student ────────────────────────────────────────────────────
  if (r === ROLES.STUDENT.toLowerCase()) {
    const isSelf =
      viewer.userId !== undefined &&
      gate.studentUserId !== undefined &&
      String(gate.studentUserId) === String(viewer.userId);

    return {
      tierLabel: "Tier 0 • Student",
      mode: "reference-readonly",
      whyRoleIsHere: isSelf
        ? "Your gate movement record — shows when and where you were last scanned."
        : "Gate status reference view for your role.",
      visibleSections: ["gate-status", "sla"],
      actions: [
        {
          id: "my-passes",
          label: "My Passes & QR",
          tone: "link" as const,
          href: "/student/passes",
        },
        {
          id: "raise-discrepancy",
          label: "Raise Discrepancy",
          tone: "secondary" as const,
          href: "/student/complaints/new",
        },
      ],
    };
  }

  // ── Tier 0B: Guardian ──────────────────────────────────────────────────
  if (r === ROLES.GUARDIAN.toLowerCase() || r === ROLES.PARENT.toLowerCase()) {
    return {
      tierLabel: "Tier 0 • Guardian",
      mode: "reference-readonly",
      whyRoleIsHere: "Monitor your ward's gate movement and verify pass status once active.",
      visibleSections: ["gate-status", "scan-log", "sla"],
      actions: [
        {
          id: "ward-move",
          label: "Ward Gate Movement",
          tone: "link" as const,
          href: "/guardian/movement-info",
        },
      ],
    };
  }

  // ── Tier 1: Gate Operator ──────────────────────────────────────────────
  if (r === ROLES.OPERATOR.toLowerCase()) {
    const gateHref =
      gate.gateCode
        ? `/gate/${gate.gateCode}`
        : viewer.assignedGateId
          ? `/gate/${viewer.assignedGateId}`
          : "/operator";

    const isLockdown = status === "LOCKDOWN";

    return {
      tierLabel: "Tier 1 • Gate Operator",
      mode: "gate-verify",
      whyRoleIsHere: isLockdown
        ? `Gate "${gate.gateCode ?? gate.id}" is in LOCKDOWN — no IN/OUT scans are permitted.`
        : `Gate "${gate.gateCode ?? gate.id}" is ${status} — confirm pass validity and execute the IN/OUT scan.`,
      visibleSections: ["gate-status", "scan-log", "curfew"],
      actions: [
        {
          id: "scan-desk",
          label: "Open Gate Scan Desk",
          tone: "primary" as const,
          href: gateHref,
        },
        ...(isLockdown
          ? []
          : [
              {
                id: "log-in",
                label: "Log IN Scan",
                tone: "secondary" as const,
                apiMethod: "POST" as const,
                apiAction: "scan-in" as const,
              },
              {
                id: "log-out",
                label: "Log OUT Scan",
                tone: "secondary" as const,
                apiMethod: "POST" as const,
                apiAction: "scan-out" as const,
              },
              {
                id: "manual-entry",
                label: "Manual Entry",
                tone: "link" as const,
                href: gate.studentRoll
                  ? `/operator/manual-entry?id=${encodeURIComponent(gate.studentRoll)}`
                  : "/operator/manual-entry",
              },
            ]),
      ],
    };
  }

  // ── Tier 2: Deputy Warden / Hostel Manager / Exam Superintendent ───────
  if (GATE_TIER2_ROLES.indexOf(r) !== -1) {
    return {
      tierLabel: `Tier 2 • ${r.replace("_", " ").toUpperCase()}`,
      mode: "gate-act",
      whyRoleIsHere: isOperational
        ? `Gate "${gate.gateCode ?? gate.id}" is ${status} — manage curfew, review exceptions, and handle shift handovers.`
        : `Gate "${gate.gateCode ?? gate.id}" is ${status} — available for review.`,
      visibleSections: ["gate-status", "curfew", "exceptions", "shift-handover", "sla"],
      actions: [
        {
          id: "curfew",
          label: "Manage Curfew",
          tone: "primary" as const,
          apiMethod: "PATCH" as const,
          apiAction: "curfew" as const,
        },
        {
          id: "exceptions",
          label: "Review Exceptions",
          tone: "secondary" as const,
          href: "/supervisor/response/exceptions",
        },
        {
          id: "handover",
          label: "Shift Handover",
          tone: "secondary" as const,
          href: "/supervisor/shift/handover",
        },
        {
          id: "view-gate",
          label: "Open Gate Record",
          tone: "link" as const,
          href: `/gate/${gate.gateCode ?? gate.id}`,
        },
      ],
    };
  }

  // ── Tier 3: Admin / SysAdmin ──────────────────────────────────────────
  if (GATE_ADMIN_ROLES.indexOf(r) !== -1) {
    const isSysadmin = r === ROLES.SYSADMIN.toLowerCase();
    return {
      tierLabel: isSysadmin ? "Tier 3 • SysAdmin (Diagnostic)" : "Tier 3 • Admin (Gate Management)",
      mode: "gate-admin",
      whyRoleIsHere: isSysadmin
        ? `Diagnostic view of gate "${gate.gateCode ?? gate.id}": inspect workflow state, linked sessions, and audit logs.`
        : `Manage gate mode, device configuration, and operational health for "${gate.gateCode ?? gate.id}".`,
      visibleSections: ["gate-status", "devices", "audit"],
      actions: [
        {
          id: "set-mode",
          label: "Set Gate Mode",
          tone: "primary" as const,
          apiMethod: "PATCH" as const,
          apiAction: "set-mode" as const,
        },
        {
          id: "view-devices",
          label: "Device Configuration",
          tone: "secondary" as const,
          href: "/admin/gate-device-configuration",
        },
        {
          id: "gate-health",
          label: "Gate Health Dashboard",
          tone: "link" as const,
          href: `/admin/gates/${gate.id}`,
        },
        ...(isSysadmin
          ? [
              {
                id: "sys-devices",
                label: "Inspect Devices",
                tone: "link" as const,
                href: "/sysadmin/devices",
              },
              {
                id: "audit-trail",
                label: "Audit Trail",
                tone: "link" as const,
                href: "/sysadmin/audit",
              },
            ]
          : []),
      ],
    };
  }

  // ── Default: all other roles (faculty, hod, visitor, staff, etc.) ─────
  return {
    tierLabel: "Default Viewer",
    mode: "gate-observe",
    whyRoleIsHere: `Gate "${gate.gateCode ?? gate.id}" is ${status} — view-only access for your role.`,
    visibleSections: ["gate-status"],
    actions: [
      {
        id: "view-gate",
        label: "View Gate",
        tone: "link" as const,
        href: `/gate/${gate.gateCode ?? gate.id}`,
      },
    ],
  };
}
