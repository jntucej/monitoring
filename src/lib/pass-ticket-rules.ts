/**
 * pass-ticket-rules — role-specific capability ruleset for a Pass / Permission Ticket.
 *
 * Extends the coarse `resolvePermissionAbility()` in record-abilities.ts with
 * a richer output shape that drives per-tier UI rendering (visible sections,
 * action tone, required notes, etc.) instead of raw `RecordAction[]`.
 *
 * Design:
 *   - Pure function. No React, no hooks.
 *   - Returns a rule set the tier-view can render directly.
 *   - Composes with entity-access.ts for route resolution.
 */

import { ROLES, type Role } from "@/lib/roles";
import { getFullPageRoute, type EntityKind } from "@/lib/entity-access";

/* ── public shapes ───────────────────────────────────────────────────────── */

export type PassAbilityMode =
  | "requester-loop" // student / guardian self-service
  | "gate-verify"    // operator scans at gate
  | "stage-act"      // it's this role's turn to decide
  | "stage-wait"     // observing; not their step
  | "exec-intervene" // override / escalate
  | "sys-trace";     // audit / diagnostic

export interface PassActionSpec {
  id: string;
  label: string;
  /** "primary" | "secondary" | "danger" | "link" */
  tone: "primary" | "secondary" | "danger" | "link";
  href?: string;
  apiMethod?: "PATCH" | "POST";
  apiAction?: "approve" | "reject" | "forward" | "escalate";
  requiresNote?: boolean;
}

export interface PassTicketRuleSet {
  tierLabel: string;
  mode: PassAbilityMode;
  whyRoleIsHere: string;
  visibleSections: Array<
    "pass-qr" | "chain" | "student-context" | "gate-scan" | "sla" | "audit"
  >;
  actions: PassActionSpec[];
}

export interface PassTicketSnapshot {
  id: string;
  ticketNumber: string;
  workflowType: string;
  status: string; // PENDING | APPROVED | REJECTED | ESCALATED
  currentStage: string;
  studentId?: string;
  studentName?: string;
  studentRoll?: string;
  hasProofDocument?: boolean;
  hasGateScan?: boolean;
}

export interface PassViewerContext {
  role: Role | string;
  userId?: string;
  hostelScope?: string | null;
  assignedGateId?: string | null;
}

/* ── resolver ─────────────────────────────────────────────────────────────── */

const STAGE_OWNERS: Record<string, string[]> = {
  faculty: [ROLES.FACULTY],
  hod: [ROLES.HOD],
  deputy_warden: [ROLES.DEPUTY_WARDEN],
  hostel_manager: [ROLES.HOSTEL_MANAGER],
  exam_branch: [ROLES.EXAM_BRANCH],
  oie: [ROLES.OIE, ROLES.EXAM_SUPERINTENDENT],
};

const EXEC_ROLES: string[] = [
  ROLES.VICE_PRINCIPAL,
  ROLES.PRINCIPAL,
  ROLES.SUPERVISOR,
  ROLES.ADMIN,
];

const TIER1_OPERATIONAL: string[] = [
  ROLES.CARETAKER,
  ROLES.WORKER,
  ROLES.MESS_INCHARGE,
];

const TIER2_APPROVERS: string[] = [
  ROLES.FACULTY,
  ROLES.HOD,
  ROLES.DEPUTY_WARDEN,
  ROLES.HOSTEL_MANAGER,
  ROLES.EMO,
  ROLES.EXAM_BRANCH,
  ROLES.OIE,
  ROLES.EXAM_SUPERINTENDENT,
];

export function getPassTicketRulesForRole(
  viewer: PassViewerContext,
  ticket: PassTicketSnapshot,
): PassTicketRuleSet {
  const r = String(viewer.role).toLowerCase();
  const stage = ticket.currentStage.toLowerCase();
  const isPending =
    ticket.status.toUpperCase() === "PENDING" ||
    ticket.status.toUpperCase() === "ESCALATED";

  // ── Tier 0A: Student (Requester) ────────────────────────────────────────
  if (r === ROLES.STUDENT.toLowerCase()) {
    const approved = ticket.status.toUpperCase() === "APPROVED";
    return {
      tierLabel: "Tier 0 • Requester (Student)",
      mode: "requester-loop",
      whyRoleIsHere: "You submitted this request; track approvals, attach proof documents, or use your pass QR once approved.",
      visibleSections: ["pass-qr", "chain", "sla"],
      actions: [
        {
          id: "lifecycle",
          label: "Full Ticket Timeline",
          tone: "link",
          href: `/permissions/${ticket.id}`,
        },
        ...(approved
          ? [
              {
                id: "qr-pass",
                label: "Open Gate Pass & QR",
                tone: "primary" as const,
                href: "/student/passes",
              },
            ]
          : [
              {
                id: "new-req",
                label: "New Request",
                tone: "secondary" as const,
                href: "/student/permissions/new",
              },
            ]),
      ],
    };
  }

  // ── Tier 0B: Guardian ──────────────────────────────────────────────────
  if (r === ROLES.GUARDIAN.toLowerCase() || r === ROLES.PARENT.toLowerCase()) {
    return {
      tierLabel: "Tier 0 • Guardian",
      mode: "requester-loop",
      whyRoleIsHere: "Monitor your ward's permission approval stage and verify gate movement once active.",
      visibleSections: ["chain", "gate-scan", "sla"],
      actions: [
        {
          id: "ward-move",
          label: "Ward Gate Movement",
          tone: "link" as const,
          href: "/guardian/movement-info",
        },
        {
          id: "ward-status",
          label: "All Ward Requests",
          tone: "link" as const,
          href: "/guardian/request-status",
        },
      ],
    };
  }

  // ── Tier 1: Frontline Gate Operator / Caretaker / Worker / Mess Incharge ─
  if (r === ROLES.OPERATOR.toLowerCase()) {
    return {
      tierLabel: "Tier 1 • Gate Operator",
      mode: "gate-verify",
      whyRoleIsHere: "Confirm pass status and execute IN/OUT verification at the gate—operators do not approve or reject policy requests.",
      visibleSections: ["pass-qr", "student-context", "gate-scan"],
      actions: [
        {
          id: "scan-desk",
          label: "Go to Gate Scan Desk",
          tone: "primary",
          href: viewer.assignedGateId
            ? `/gate/${viewer.assignedGateId}`
            : "/operator",
        },
        ...(ticket.studentRoll
          ? [
              {
                id: "lookup",
                label: "Student Lookup",
                tone: "link" as const,
                href: `/operator/lookup?roll=${encodeURIComponent(ticket.studentRoll)}`,
              },
            ]
          : []),
      ],
    };
  }

  const roleArr = TIER1_OPERATIONAL;
  if (roleArr.indexOf(r) !== -1) {
    return {
      tierLabel: `Tier 1 • ${r.replace("_", " ").toUpperCase()} (${r})`,
      mode: "stage-wait",
      whyRoleIsHere: "Operational reference view for hostel/mess/facility coordination around this resident's movement.",
      visibleSections: ["student-context", "sla"],
      actions: [
        {
          id: "ticket-view",
          label: "Open Ticket Record",
          tone: "link",
          href: `/permissions/${ticket.id}`,
        },
      ],
    };
  }

  // ── Tier 2: Stage Approvers ────────────────────────────────────────────
  const stageOwners = STAGE_OWNERS[stage] ?? [];
  const isMyTurn = isPending && stageOwners.includes(r as Role);

  if (TIER2_APPROVERS.indexOf(r) !== -1) {
    // isMyTurn uses the already-computed stageOwners
    if (isMyTurn) {
      return {
        tierLabel: `Tier 2 • Active Stage Approver (${r.replace("_", " ")})`,
        mode: "stage-act",
        whyRoleIsHere: `This ticket is waiting at stage "${ticket.currentStage}"—your decision moves or closes the workflow.`,
        visibleSections: ["student-context", "chain", "gate-scan", "sla"],
        actions: [
          {
            id: "approve",
            label:
              stage === "exam_branch"
                ? "Verify & Forward to OIE"
                : stage === "oie"
                ? "Approve Exam Clearance"
                : "Approve",
            tone: "primary",
            apiMethod: "PATCH",
            apiAction: "approve",
          },
          {
            id: "forward",
            label: "Forward Next Stage",
            tone: "secondary",
            apiMethod: "PATCH",
            apiAction: "forward",
          },
          {
            id: "reject",
            label: "Reject",
            tone: "danger",
            apiMethod: "PATCH",
            apiAction: "reject",
            requiresNote: true,
          },
          {
            id: "open-ticket",
            label: "Inspect Full Ticket",
            tone: "link",
            href: `/permissions/${ticket.id}`,
          },
        ],
      };
    }

    return {
      tierLabel: `Tier 2 • Workflow Observer (${r.replace("_", " ")})`,
      mode: "stage-wait",
      whyRoleIsHere: `Currently at stage "${ticket.currentStage}" (${ticket.status}). Actions stay locked to the active stage owner.`,
      visibleSections: ["chain", "student-context", "sla"],
      actions: [
        {
          id: "open-ticket",
          label: "Inspect Full Ticket",
          tone: "link",
          href: `/permissions/${ticket.id}`,
        },
      ],
    };
  }

  // ── Tier 3: Executive & Admin Command ──────────────────────────────────
  if (EXEC_ROLES.indexOf(r) !== -1) {
    return {
      tierLabel: `Tier 3 • Command & Oversight (${r.replace("_", " ")})`,
      mode: isPending ? "exec-intervene" : "stage-wait",
      whyRoleIsHere: isPending
        ? `Oversight & intervention mode: ticket is at "${ticket.currentStage}". You can intervene, escalate, or inspect full context.`
        : `Closed/settled ticket (${ticket.status}): inspect chain history, SLA compliance, and audit trail.`,
      visibleSections: ["student-context", "chain", "gate-scan", "sla", "audit"],
      actions: [
        ...(isPending
          ? ([
              {
                id: "override-approve",
                label: "Approve / Override",
                tone: "primary" as const,
                apiMethod: "PATCH" as const,
                apiAction: "approve" as const,
              },
              {
                id: "escalate",
                label: "Escalate",
                tone: "secondary" as const,
                apiMethod: "PATCH" as const,
                apiAction: "escalate" as const,
                requiresNote: true,
              },
            ] satisfies PassActionSpec[])
          : []),
        {
          id: "full-detail",
          label: "Open Full Ticket",
          tone: "link" as const,
          href: `/permissions/${ticket.id}`,
        },
      ],
    };
  }

  // ── Tier 4: SysAdmin ──────────────────────────────────────────────────
  if (r === ROLES.SYSADMIN.toLowerCase()) {
    return {
      tierLabel: "Tier 4 • System Administrator",
      mode: "sys-trace",
      whyRoleIsHere: "Diagnostic & audit trace view: inspect workflow state transitions, user sessions, and system audit logs.",
      visibleSections: ["chain", "student-context", "gate-scan", "audit"],
      actions: [
        {
          id: "full-detail",
          label: "Raw Ticket View",
          tone: "link",
          href: `/permissions/${ticket.id}`,
        },
        {
          id: "audit-log",
          label: "Audit Trail",
          tone: "link",
          href: "/sysadmin/audit",
        },
        {
          id: "sessions",
          label: "Active Sessions",
          tone: "link",
          href: "/sysadmin/sessions",
        },
        {
          id: "workflow-config",
          label: "Workflow Config",
          tone: "link",
          href: "/admin/workflow-configuration",
        },
      ],
    };
  }

  // ── Fallback: other staff roles (operator, admin staff, etc.) ──────────
  return {
    tierLabel: "Default Viewer",
    mode: "stage-wait",
    whyRoleIsHere: `Event is at stage "${ticket.currentStage}" (${ticket.status}) — view-only access.`,
    visibleSections: ["chain", "student-context"],
    actions: [
      {
        id: "view-ticket",
        label: "View Ticket Details",
        tone: "link",
        href: `/permissions/${ticket.id}`,
      },
    ],
  };
}
