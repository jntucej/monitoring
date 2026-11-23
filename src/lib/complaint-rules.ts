/**
 * complaint-rules — role-specific capability rulesets for a Complaint / Maintenance Event.
 *
 * Mirrors the tier structure of `pass-ticket-rules.ts`:
 *   Tier 0 — student (requester) / guardian (ward monitor)
 *   Tier 1 — operational handlers (caretaker, worker, emo, hostel_manager)
 *   Tier 2 — supervisor / deputy_warden (curfew, exceptions, shift handover)
 *   Tier 3 — executive / admin (vice_principal, principal, admin)
 *   Tier 4 — sysadmin
 *
 * The coarse "can this role inspect/act?" gate lives in entity-access.ts.
 * This module is the fine layer: it returns which sections and action buttons
 * a specific role sees for a specific complaint record.
 */

import { ROLES, type Role } from "@/lib/roles";

/* ── public shapes ───────────────────────────────────────────────────────── */

export type ComplaintAbilityMode =
  | "requester-track"   // student / guardian
  | "handler-act"       // caretaker / worker / emo / hostel_manager (in scope, open)
  | "handler-observe"   // handler out of scope or complaint closed
  | "supervisor-act"    // supervisor / deputy_warden (curfew, exceptions, handover)
  | "exec-intervene"    // vice_principal / principal / admin
  | "sys-trace";        // sysadmin

export interface ComplaintActionSpec {
  id: string;
  label: string;
  tone: "primary" | "secondary" | "danger" | "link";
  href?: string;
  apiMethod?: "PATCH" | "POST";
  apiAction?: "resolve" | "escalate" | "add-note";
  requiresNote?: boolean;
}

export interface ComplaintRuleSet {
  tierLabel: string;
  mode: ComplaintAbilityMode;
  whyRoleIsHere: string;
  visibleSections: Array<
    "complaint-context" | "timeline" | "assignments" | "attachments" | "sla" | "audit"
  >;
  actions: ComplaintActionSpec[];
}

export interface ComplaintSnapshot {
  id: string;
  complaintNumber?: string;
  category?: string;
  status: string; // OPEN | IN_PROGRESS | RESOLVED | ESCALATED
  currentStage?: string;
  raisedByUserId?: string;
  hostelScope?: string | null;
  slaDeadline?: string | null;
}

export interface ComplaintViewerContext {
  role: Role | string;
  userId?: string;
  hostelScope?: string | null;
  departmentId?: string | null;
}

/* ── resolver ─────────────────────────────────────────────────────────────── */

const HANDLER_ROLES: string[] = [
  ROLES.CARETAKER,
  ROLES.WORKER,
  ROLES.EMO,
  ROLES.HOSTEL_MANAGER,
];

const SUPERVISOR_ROLES: string[] = [
  ROLES.SUPERVISOR,
  ROLES.DEPUTY_WARDEN,
];

const EXEC_ROLES: string[] = [
  ROLES.VICE_PRINCIPAL,
  ROLES.PRINCIPAL,
  ROLES.ADMIN,
];

export function getComplaintRulesForRole(
  viewer: ComplaintViewerContext,
  complaint: ComplaintSnapshot,
): ComplaintRuleSet {
  const r = String(viewer.role).toLowerCase();
  const status = complaint.status.toUpperCase();
  const isOpen = status === "OPEN" || status === "IN_PROGRESS" || status === "ESCALATED";

  // ── Tier 0A: Student (requester) ────────────────────────────────────────
  if (r === ROLES.STUDENT.toLowerCase()) {
    const isSelf =
      viewer.userId !== undefined &&
      complaint.raisedByUserId !== undefined &&
      String(complaint.raisedByUserId) === String(viewer.userId);

    if (isSelf) {
      return {
        tierLabel: "Tier 0 • Requester (Student)",
        mode: "requester-track",
        whyRoleIsHere: "You raised this complaint — track its progress or escalate it.",
        visibleSections: ["complaint-context", "timeline", "sla"],
        actions: [
          {
            id: "view-complaint",
            label: "View Complaint Status",
            tone: "link" as const,
            href: `/student/complaints/${complaint.id}`,
          },
          ...(isOpen
            ? [
                {
                  id: "escalate",
                  label: "Escalate Complaint",
                  tone: "secondary" as const,
                  apiMethod: "PATCH" as const,
                  apiAction: "escalate" as const,
                  requiresNote: true,
                },
              ]
            : []),
        ],
      };
    }

    return {
      tierLabel: "Tier 0 • Student Viewer",
      mode: "requester-track",
      whyRoleIsHere: "You are viewing a complaint raised by another user.",
      visibleSections: ["complaint-context", "timeline"],
      actions: [
        {
          id: "new-complaint",
          label: "File New Complaint",
          tone: "primary" as const,
          href: "/student/complaints/new",
        },
      ],
    };
  }

  // ── Tier 0B: Guardian ──────────────────────────────────────────────────
  if (r === ROLES.GUARDIAN.toLowerCase() || r === ROLES.PARENT.toLowerCase()) {
    return {
      tierLabel: "Tier 0 • Guardian",
      mode: "requester-track",
      whyRoleIsHere: "Monitor your ward's complaint progress and gate movement status.",
      visibleSections: ["complaint-context", "timeline", "sla"],
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

  // ── Tier 1: Operational Handlers ──────────────────────────────────────
  if (HANDLER_ROLES.indexOf(r) !== -1) {
    const inScope =
      !complaint.hostelScope ||
      !viewer.hostelScope ||
      complaint.hostelScope === viewer.hostelScope;

    if (inScope && isOpen) {
      return {
        tierLabel: `Tier 1 • Operational Handler (${r.replace("_", " ")})`,
        mode: "handler-act",
        whyRoleIsHere: `This complaint is open and within your ${complaint.hostelScope ?? "assigned"} scope — you can add field notes or update its status.`,
        visibleSections: ["complaint-context", "assignments", "attachments", "sla"],
        actions: [
          {
            id: "add-note",
            label: "Add Field Note",
            tone: "secondary" as const,
            apiMethod: "POST" as const,
            apiAction: "add-note" as const,
            requiresNote: true,
          },
          {
            id: "resolve",
            label: "Mark Resolved",
            tone: "primary" as const,
            apiMethod: "PATCH" as const,
            apiAction: "resolve" as const,
          },
          {
            id: "view-complaint",
            label: "Open Complaint",
            tone: "link" as const,
            href: `/complaints/${complaint.id}`,
          },
        ],
      };
    }

    return {
      tierLabel: `Tier 1 • Operational Observer (${r.replace("_", " ")})`,
      mode: "handler-observe",
      whyRoleIsHere: inScope
        ? `Complaint is ${status || "closed"} — out of your active step.`
        : `Complaint is in "${complaint.hostelScope ?? "unknown"}" scope; you are scoped to "${viewer.hostelScope ?? "campus-wide"}".`,
      visibleSections: ["complaint-context", "timeline", "sla"],
      actions: [
        {
          id: "view-complaint",
          label: "View Complaint",
          tone: "link" as const,
          href: `/complaints/${complaint.id}`,
        },
      ],
    };
  }

  // ── Tier 2: Supervisor / Deputy Warden ────────────────────────────────
  if (SUPERVISOR_ROLES.indexOf(r) !== -1) {
    return {
      tierLabel: `Tier 2 • ${r.replace("_", " ").toUpperCase()} (Supervisor)`,
      mode: "supervisor-act",
      whyRoleIsHere: isOpen
        ? `You oversee operational response: review exceptions, update status, or hand over pending work.`
        : `Complaint is ${status} — available for review and audit.`,
      visibleSections: ["complaint-context", "assignments", "timeline", "sla", "audit"],
      actions: [
        ...(isOpen
          ? [
              {
                id: "resolve",
                label: "Override Resolve",
                tone: "primary" as const,
                apiMethod: "PATCH" as const,
                apiAction: "resolve" as const,
              },
              {
                id: "escalate",
                label: "Escalate to Principal",
                tone: "secondary" as const,
                apiMethod: "PATCH" as const,
                apiAction: "escalate" as const,
                requiresNote: true,
              },
            ]
          : []),
        {
          id: "view-complaint",
          label: "Open Complaint",
          tone: "link" as const,
          href: `/complaints/${complaint.id}`,
        },
      ],
    };
  }

  // ── Tier 3: Executive / Admin ─────────────────────────────────────────
  if (EXEC_ROLES.indexOf(r) !== -1) {
    return {
      tierLabel: `Tier 3 • Command & Oversight (${r.replace("_", " ")})`,
      mode: "exec-intervene",
      whyRoleIsHere: isOpen
        ? `Oversight & intervention mode: complaint is ${status}. You can intervene, resolve, or escalate.`
        : `Closed complaint (${status}): inspect timeline, SLA compliance, and audit trail.`,
      visibleSections: ["complaint-context", "assignments", "timeline", "sla", "audit"],
      actions: [
        ...(isOpen
          ? [
              {
                id: "resolve",
                label: "Resolve / Override",
                tone: "primary" as const,
                apiMethod: "PATCH" as const,
                apiAction: "resolve" as const,
              },
              {
                id: "escalate",
                label: "Escalate",
                tone: "secondary" as const,
                apiMethod: "PATCH" as const,
                apiAction: "escalate" as const,
                requiresNote: true,
              },
            ]
          : []),
        {
          id: "view-complaint",
          label: "Open Complaint",
          tone: "link" as const,
          href: `/complaints/${complaint.id}`,
        },
      ],
    };
  }

  // ── Tier 4: SysAdmin ──────────────────────────────────────────────────
  if (r === ROLES.SYSADMIN.toLowerCase()) {
    return {
      tierLabel: "Tier 4 • System Administrator",
      mode: "sys-trace",
      whyRoleIsHere: "Diagnostic & audit trace view: inspect complaint lifecycle, linked sessions, and system audit logs.",
      visibleSections: ["timeline", "assignments", "audit"],
      actions: [
        {
          id: "raw-view",
          label: "Raw Complaint View",
          tone: "link" as const,
          href: `/complaints/${complaint.id}`,
        },
        {
          id: "audit-log",
          label: "Audit Trail",
          tone: "link" as const,
          href: "/sysadmin/audit",
        },
      ],
    };
  }

  // ── Default: other roles (faculty, hod, visitor, staff, etc.) ─────────
  return {
    tierLabel: "Default Viewer",
    mode: "handler-observe",
    whyRoleIsHere: `Complaint is ${status} (${complaint.category ?? "uncategorized"}) — view-only access.`,
    visibleSections: ["complaint-context", "timeline"],
    actions: [
      {
        id: "view-complaint",
        label: "View Complaint",
        tone: "link" as const,
        href: `/complaints/${complaint.id}`,
      },
    ],
  };
}
