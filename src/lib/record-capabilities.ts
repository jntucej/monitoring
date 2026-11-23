/**
 * record-capabilities — unified capability engine for every record type.
 *
 * Drop this single typed engine into your codebase so every page, drawer,
 * table row, and inline link resolves perception, visible sections,
 * relational pivots, and permitted actions consistently across all record
 * types.
 *
 * Design rules:
 *   - Pure function. No React, no hooks.
 *   - Composes with entity-access.ts (coarse "can this role inspect/act?").
 *   - Reuses the tier model from pass-ticket-rules.ts / complaint-rules.ts
 *     / gate-event-rules.ts — one canonical tier per role, no duplication.
 *   - Server is always the source of truth. UI gating only hides, never
 *     permits.
 */

import type { Role } from "@/lib/roles";
import type { EntityKind } from "@/lib/entity-access";

/* ── public shapes ───────────────────────────────────────────────────────── */

export type RecordKind =
  | "ticket"
  | "complaint"
  | "gate"
  | "scan"
  | "student"
  | "faculty"
  | "device";

export type AbilityMode =
  | "act"       // stage-gated decision desk
  | "verify"    // physical execution / scan
  | "observe"   // upstream/downstream chain + context
  | "self-loop" // student / guardian personal tracking
  | "sys-trace"; // audit & diagnostic

export interface PivotLink {
  kind: RecordKind;
  id: string;
  label: string;
  href?: string;
}

export interface RecordActionItem {
  id: string;
  label: string;
  intent: "primary" | "secondary" | "danger" | "navigate";
  href?: string;
  mutation?: {
    method: "PATCH" | "POST" | "DELETE";
    endpoint: string;
    payload?: Record<string, unknown>;
  };
  requiresNote?: boolean;
}

export interface ResolvedRecordView {
  tier: "tier-0" | "tier-1" | "tier-2" | "tier-3" | "tier-4";
  mode: AbilityMode;
  perceptionTitle: string;
  whyRoleIsHere: string;
  sections: string[];
  pivots: PivotLink[];
  actions: RecordActionItem[];
  fullPageHref: string | null;
}

export interface ViewerSession {
  userId: string;
  role: Role | string;
  departmentId?: string | null;
  hostelScope?: string | null;
  gateId?: string | null;
}

/* ── tier mapping ────────────────────────────────────────────────────────── */

export function getTierForRole(role: string | undefined): ResolvedRecordView["tier"] {
  const r = (role ?? "student").toLowerCase();
  if (["student", "guardian", "visitor"].includes(r)) return "tier-0";
  if (["operator", "worker", "caretaker", "mess_incharge"].includes(r))
    return "tier-1";
  if (
    [
      "faculty",
      "hod",
      "deputy_warden",
      "hostel_manager",
      "emo",
      "exam_branch",
      "oie",
      "exam_superintendent",
      "staff",
    ].includes(r)
  )
    return "tier-2";
  if (["vice_principal", "principal", "supervisor", "admin"].includes(r))
    return "tier-3";
  return "tier-4";
}

/* ── main resolver ───────────────────────────────────────────────────────── */

export function resolveRecordView(
  kind: RecordKind,
  record: Record<string, any>,
  viewer: ViewerSession,
): ResolvedRecordView {
  const tier = getTierForRole(String(viewer.role));
  const role = String(viewer.role).toLowerCase();
  const id = String(record.id ?? record.ticket_number ?? record.code ?? "");

  /* ── 1. TICKET / PASS / EXAM CLEARANCE ────────────────────────────────── */
  if (kind === "ticket") {
    const ticketNo = String(record.ticket_number ?? id);
    const stage = String(record.current_stage ?? "").toLowerCase();
    const status = String(record.status ?? "PENDING").toUpperCase();
    const isPending =
      status === "PENDING" || status === "ESCALATED" || status === "OVERDUE";

    const pivots: PivotLink[] = [
      ...(record.student_user_id || record.student?.id
        ? [
            {
              kind: "student" as const,
              id: String(
                record.student?.unique_id ??
                  record.student?.id ??
                  record.student_user_id,
              ),
              label: record.student?.name
                ? `Student: ${record.student.name}`
                : "Student Profile",
            },
          ]
        : []),
    ];

    if (tier === "tier-0") {
      const isGuardian = role === "guardian" || role === "parent";
      return {
        tier,
        mode: "self-loop",
        perceptionTitle: isGuardian
          ? "Ward Request Tracker"
          : "My Pass Lifecycle",
        whyRoleIsHere: isGuardian
          ? "Track your ward's approval progress and check gate exit/return logs."
          : "Follow your request through each approval stage and access your QR pass once approved.",
        sections: ["chain", "sla", "documents"],
        pivots: isGuardian
          ? [
              {
                kind: "student",
                id: "ward",
                label: "Ward Movement",
                href: "/guardian/movement-info",
              },
            ]
          : [],
        actions: [
          ...(status === "APPROVED" && role === "student"
            ? [
                {
                  id: "show-qr",
                  label: "Open Gate Pass QR",
                  intent: "primary" as const,
                  href: "/student/passes",
                },
              ]
            : []),
          {
            id: "open-lifecycle",
            label: "Full Timeline",
            intent: "navigate",
            href: isGuardian
              ? `/guardian/request-status?ticket=${ticketNo}`
              : `/student/passes/${id}`,
          },
        ],
        fullPageHref: isGuardian
          ? "/guardian/request-status"
          : `/student/passes/${id}`,
      };
    }

    if (tier === "tier-1") {
      return {
        tier,
        mode: "verify",
        perceptionTitle: "Gate & Operational Pass Check",
        whyRoleIsHere:
          "Verify pass authorization window and execute physical gate scan—policy approvals are handled by Tier 2+.",
        sections: ["pass-validity", "student-summary", "last-scan"],
        pivots,
        actions:
          role === "operator"
            ? [
                {
                  id: "open-desk",
                  label: "Open Gate Scan Desk",
                  intent: "primary",
                  href: viewer.gateId ? `/gate/${viewer.gateId}` : "/gate",
                },
              ]
            : [],
        fullPageHref: null,
      };
    }

    const stageMatch: Record<string, string[]> = {
      faculty: ["faculty"],
      hod: ["hod"],
      deputy_warden: ["deputy_warden"],
      hostel_manager: ["hostel_manager"],
      exam_branch: ["exam_branch"],
      oie: ["oie", "exam_superintendent"],
    };
    const isStageOwner = isPending && (stageMatch[stage] ?? []).includes(role);

    if (tier === "tier-2") {
      return {
        tier,
        mode: isStageOwner ? "act" : "observe",
        perceptionTitle: isStageOwner
          ? `Stage Decision (${stage.toUpperCase()})`
          : "Workflow Stage Observer",
        whyRoleIsHere: isStageOwner
          ? `This ticket is currently at "${stage}" awaiting your sign-off.`
          : `Ticket is at "${stage}" (${status}). Context is visible; decision buttons activate when routed to your stage.`,
        sections: ["student-eligibility", "chain", "sla", "documents"],
        pivots,
        actions: isStageOwner
          ? [
              {
                id: "approve",
                label:
                  stage === "exam_branch"
                    ? "Verify & Forward to OIE"
                    : "Approve",
                intent: "primary",
                mutation: {
                  method: "PATCH",
                  endpoint: `/api/permissions/${ticketNo}`,
                  payload: { action: "approve" },
                },
              },
              {
                id: "forward",
                label: "Forward Stage",
                intent: "secondary",
                mutation: {
                  method: "PATCH",
                  endpoint: `/api/permissions/${ticketNo}`,
                  payload: { action: "forward" },
                },
              },
              {
                id: "reject",
                label: "Reject",
                intent: "danger",
                requiresNote: true,
                mutation: {
                  method: "PATCH",
                  endpoint: `/api/permissions/${ticketNo}`,
                  payload: { action: "reject" },
                },
              },
            ]
          : [
              {
                id: "view-full",
                label: "Open Full Ticket",
                intent: "navigate",
                href: `/permissions/${id}`,
              },
            ],
        fullPageHref: `/permissions/${id}`,
      };
    }

    if (tier === "tier-3") {
      return {
        tier,
        mode: isPending ? "act" : "observe",
        perceptionTitle: "Executive & Governance Oversight",
        whyRoleIsHere: isPending
          ? `Oversight authority: intervene, approve/override, or escalate while at "${stage}".`
          : `Closed ticket (${status})—inspect SLA performance, chain history, and student movement.`,
        sections: [
          "student-eligibility",
          "chain",
          "sla",
          "gate-scans",
          "audit",
        ],
        pivots,
        actions: [
          ...(isPending
            ? [
                {
                  id: "override-approve",
                  label: "Approve / Override",
                  intent: "primary" as const,
                  mutation: {
                    method: "PATCH" as const,
                    endpoint: `/api/permissions/${ticketNo}`,
                    payload: { action: "approve" },
                  },
                },
                {
                  id: "escalate",
                  label: "Escalate",
                  intent: "secondary" as const,
                  requiresNote: true,
                  mutation: {
                    method: "PATCH" as const,
                    endpoint: `/api/permissions/${ticketNo}`,
                    payload: { action: "escalate" },
                  },
                },
              ]
            : []),
          {
            id: "view-full",
            label: "Open Full Ticket",
            intent: "navigate",
            href: `/permissions/${id}`,
          },
        ],
        fullPageHref: `/permissions/${id}`,
      };
    }

    // Tier 4: SysAdmin
    return {
      tier,
      mode: "sys-trace",
      perceptionTitle: "System Workflow & Audit Trace",
      whyRoleIsHere:
        "Inspect workflow state machine, delivery queues, and immutable audit entries.",
      sections: ["chain", "student-eligibility", "audit"],
      pivots,
      actions: [
        { id: "view-full", label: "Raw Ticket View", intent: "navigate", href: `/permissions/${id}` },
        { id: "audit", label: "Audit Logs", intent: "navigate", href: "/sysadmin/audit" },
        { id: "sessions", label: "Active Sessions", intent: "navigate", href: "/sysadmin/sessions" },
        { id: "workflow-config", label: "Workflow Config", intent: "navigate", href: "/admin/workflow-configuration" },
      ],
      fullPageHref: `/permissions/${id}`,
    };
  }

  /* ── 2. COMPLAINT / MAINTENANCE ───────────────────────────────────────── */
  if (kind === "complaint") {
    const status = String(record.status ?? "OPEN").toUpperCase();
    const isResolved = status === "RESOLVED" || status === "CLOSED";
    const isEscalated = status === "ESCALATED";

    return {
      tier,
      mode:
        tier === "tier-0"
          ? "self-loop"
          : isResolved
            ? "observe"
            : tier === "tier-1"
              ? "act"
              : "observe",
      perceptionTitle:
        tier === "tier-0"
          ? "Issue Resolution Tracker"
          : tier === "tier-1"
            ? "Field Work Order"
            : "SLA & Escalation Console",
      whyRoleIsHere:
        tier === "tier-0"
          ? "Track technician progress, escalate overdue issues, or rate completed work."
          : tier === "tier-1"
            ? "Update field status and log resolution notes for your assigned block/category."
            : isEscalated
              ? "Escalated complaint: SLA breach detected. Review and intervene."
              : "Monitor SLA compliance, reassign staff, or intervene on escalated complaints.",
      sections: ["complaint-detail", "timeline", "sla"],
      pivots: record.student_user_id
        ? [
            {
              kind: "student" as const,
              id: String(record.student_user_id),
              label: "Reporter Profile",
            },
          ]
        : [],
      actions:
        tier === "tier-0"
          ? isResolved
            ? [
                {
                  id: "rate",
                  label: "Rate Resolution",
                  intent: "primary",
                  href: `/student/complaints/${id}`,
                },
              ]
            : [
                {
                  id: "escalate-cmp",
                  label: "Escalate Issue",
                  intent: "danger",
                  requiresNote: true,
                  mutation: {
                    method: "PATCH",
                    endpoint: `/api/complaints/${id}/escalate`,
                  },
                },
              ]
          : tier === "tier-1"
            ? [
                {
                  id: "start-work",
                  label: "Mark In Progress",
                  intent: "secondary",
                  mutation: {
                    method: "PATCH",
                    endpoint: `/api/complaints/${id}`,
                    payload: { status: "IN_PROGRESS" },
                  },
                },
                {
                  id: "resolve-work",
                  label: "Mark Resolved",
                  intent: "primary",
                  requiresNote: true,
                  mutation: {
                    method: "PATCH",
                    endpoint: `/api/complaints/${id}`,
                    payload: { status: "RESOLVED" },
                  },
                },
              ]
            : [
                {
                  id: "close-cmp",
                  label: "Verify & Close",
                  intent: "primary",
                  mutation: {
                    method: "PATCH",
                    endpoint: `/api/complaints/${id}`,
                    payload: { status: "CLOSED" },
                  },
                },
                {
                  id: "escalate",
                  label: "Escalate",
                  intent: "secondary",
                  requiresNote: true,
                  mutation: {
                    method: "PATCH",
                    endpoint: `/api/complaints/${id}/escalate`,
                  },
                },
              ],
      fullPageHref:
        tier === "tier-0" ? `/student/complaints/${id}` : `/complaints/${id}`,
    };
  }

  /* ── 3. GATE / SCAN ───────────────────────────────────────────────────── */
  if (kind === "gate" || kind === "scan") {
    const status = String(record.status ?? "OPEN").toUpperCase();
    const isLockdown = status === "LOCKDOWN";
    const gateCode = String(record.gate_code ?? record.code ?? id);
    const gateHref = viewer.gateId
      ? `/gate/${viewer.gateId}`
      : gateCode
        ? `/gate/${gateCode}`
        : "/gate";

    if (tier === "tier-0") {
      const isGuardian = role === "guardian" || role === "parent";
      return {
        tier,
        mode: "self-loop",
        perceptionTitle: isGuardian
          ? "Ward Movement Log"
          : "My Gate History",
        whyRoleIsHere: isGuardian
          ? "Check your ward's recent gate entry/exit and active pass status."
          : "View your recent gate scans and active pass validity.",
        sections: ["gate-status", "scan-log", "sla"],
        pivots: record.student_user_id
          ? [
              {
                kind: "student" as const,
                id: String(record.student_user_id),
                label: "Student Profile",
              },
            ]
          : [],
        actions: [
          {
            id: "my-passes",
            label: isGuardian ? "Ward Passes" : "My Passes & QR",
            intent: "navigate",
            href: isGuardian ? "/guardian/movement-info" : "/student/passes",
          },
        ],
        fullPageHref: isGuardian
          ? "/guardian/movement-info"
          : "/student/history",
      };
    }

    if (tier === "tier-1" && role === "operator") {
      return {
        tier,
        mode: "verify",
        perceptionTitle: "Live Kiosk Transaction",
        whyRoleIsHere: isLockdown
          ? `Gate "${gateCode}" is in LOCKDOWN — no IN/OUT scans permitted.`
          : `Gate "${gateCode}" is ${status} — confirm pass validity and execute the scan.`,
        sections: ["gate-status", "student-summary", "last-scan", "curfew"],
        pivots: record.student_user_id
          ? [
              {
                kind: "student" as const,
                id: String(record.student_user_id),
                label: record.student?.name
                  ? `Student: ${record.student.name}`
                  : "Student",
              },
            ]
          : [],
        actions: [
          {
            id: "open-desk",
            label: "Open Gate Scan Desk",
            intent: "primary",
            href: gateHref,
          },
          ...(isLockdown
            ? []
            : ([
                {
                  id: "scan-in",
                  label: "Log IN",
                  intent: "secondary" as const,
                  mutation: {
                    method: "POST" as const,
                    endpoint: `/api/gates/${id}/scan`,
                    payload: { direction: "IN" },
                  },
                },
                {
                  id: "scan-out",
                  label: "Log OUT",
                  intent: "secondary" as const,
                  mutation: {
                    method: "POST" as const,
                    endpoint: `/api/gates/${id}/scan`,
                    payload: { direction: "OUT" },
                  },
                },
                {
                  id: "manual-entry",
                  label: "Manual Entry",
                  intent: "navigate" as const,
                  href: record.student_roll
                    ? `/operator/manual-entry?id=${encodeURIComponent(String(record.student_roll))}`
                    : "/operator/manual-entry",
                },
              ] satisfies RecordActionItem[])),
        ],
        fullPageHref: null,
      };
    }

    if (tier === "tier-2") {
      const isCurfewStage =
        status === "CURFEW" || status === "LOCKDOWN" || isLockdown;
      return {
        tier,
        mode: isCurfewStage ? "act" : "observe",
        perceptionTitle: isCurfewStage
          ? "Curfew & Exception Management"
          : "Gate Operations Observer",
        whyRoleIsHere: isCurfewStage
          ? `Gate "${gateCode}" is in ${status} mode — manage curfew exceptions and shift handovers.`
          : `Gate "${gateCode}" is ${status} — review movement logs and SLA compliance.`,
        sections: ["gate-status", "curfew", "exceptions", "shift-handover"],
        pivots: [],
        actions: [
          {
            id: "curfew",
            label: "Manage Curfew",
            intent: "primary",
            mutation: {
              method: "PATCH",
              endpoint: `/api/gates/${id}/curfew`,
            },
          },
          {
            id: "exceptions",
            label: "Review Exceptions",
            intent: "secondary",
            href: "/supervisor/response/exceptions",
          },
          {
            id: "handover",
            label: "Shift Handover",
            intent: "secondary",
            href: "/supervisor/shift/handover",
          },
          {
            id: "view-gate",
            label: "Open Gate Record",
            intent: "navigate",
            href: `/gate/${gateCode}`,
          },
        ],
        fullPageHref: `/gate/${gateCode}`,
      };
    }

    if (tier === "tier-3") {
      return {
        tier,
        mode: "act",
        perceptionTitle: "Perimeter Security & Device Telemetry",
        whyRoleIsHere: `Gate "${gateCode}" is ${status} — manage mode, operators, and device health.`,
        sections: ["gate-status", "devices", "scan-log", "audit"],
        pivots: [],
        actions: [
          {
            id: "set-mode",
            label: "Set Gate Mode",
            intent: "primary",
            mutation: {
              method: "PATCH",
              endpoint: `/api/admin/gates/${id}/mode`,
            },
          },
          {
            id: "devices",
            label: "Device Configuration",
            intent: "secondary",
            href: "/admin/gate-device-configuration",
          },
          {
            id: "gate-health",
            label: "Gate Health Dashboard",
            intent: "navigate",
            href: `/admin/gates/${id}`,
          },
          {
            id: "sys-devices",
            label: "Inspect Devices",
            intent: "navigate",
            href: "/sysadmin/devices",
          },
        ],
        fullPageHref: `/admin/gates/${id}`,
      };
    }

    return {
      tier: "tier-4",
      mode: "sys-trace",
      perceptionTitle: "System Diagnostics & Audit",
      whyRoleIsHere: `Diagnostic view of gate "${gateCode}": inspect workflow state, sessions, and audit logs.`,
      sections: ["gate-status", "devices", "audit"],
      pivots: [],
      actions: [
        {
          id: "audit",
          label: "Audit Trail",
          intent: "navigate",
          href: "/sysadmin/audit",
        },
        {
          id: "sessions",
          label: "Active Sessions",
          intent: "navigate",
          href: "/sysadmin/sessions",
        },
      ],
      fullPageHref: `/admin/gates/${id}`,
    };
  }

  /* ── 4. STUDENT / FACULTY IDENTITY ────────────────────────────────────── */
  if (kind === "student" || kind === "faculty") {
    const isFaculty = kind === "faculty";
    const roll = String(record.roll ?? record.unique_id ?? id);

    if (tier === "tier-0") {
      const isGuardian = role === "guardian" || role === "parent";
      return {
        tier,
        mode: "self-loop",
        perceptionTitle: isGuardian
          ? "Ward Profile"
          : isFaculty
            ? "Faculty Profile"
            : "My Student ID",
        whyRoleIsHere: isGuardian
          ? "View your ward's academic and attendance summary."
          : "View your digital ID, attendance, and active pass status.",
        sections: ["identity", "attendance", "active-passes"],
        pivots: [],
        actions: [
          {
            id: "qr-id",
            label: isGuardian ? "Ward Details" : "View QR ID",
            intent: "navigate",
            href: isGuardian ? "/guardian/child-status" : "/student/id",
          },
          ...(!isGuardian
            ? [
                {
                  id: "attendance",
                  label: "Attendance & Marks",
                  intent: "navigate" as const,
                  href: "/student/attendance",
                },
                {
                  id: "profile-settings",
                  label: "Contact & Privacy",
                  intent: "navigate" as const,
                  href: "/student/profile",
                },
              ]
            : []),
        ],
        fullPageHref: isGuardian
          ? "/guardian/child-status"
          : `/student/${roll}`,
      };
    }

    if (tier === "tier-1") {
      return {
        tier,
        mode: "verify",
        perceptionTitle: "Quick Verification Card",
        whyRoleIsHere: isFaculty
          ? `Verify ${record.name ?? "faculty"} — check credentials and scope.`
          : `Verify ${record.name ?? "student"} (${roll}) — scan IN/OUT or serve mess token.`,
        sections: ["identity", "campus-status", "active-passes"],
        pivots: [],
        actions:
          role === "mess_incharge"
            ? [
                {
                  id: "serve-mess",
                  label: "Serve Mess Token",
                  intent: "primary",
                  href: "/mess",
                },
              ]
            : [
                {
                  id: "scan-desk",
                  label: "Open Gate Scan Desk",
                  intent: "primary",
                  href: viewer.gateId ? `/gate/${viewer.gateId}` : "/operator",
                },
              ],
        fullPageHref: null,
      };
    }

    if (tier === "tier-2") {
      return {
        tier,
        mode: "observe",
        perceptionTitle: isFaculty
          ? "Faculty Profile (Scoped)"
          : "Student Profile (Academic / Hostel / Exam)",
        whyRoleIsHere: `Scoped view of ${record.name ?? roll} within your ${record.department ?? "assigned"} scope.`,
        sections: ["identity", "attendance", "active-passes", "exam-clearances", "complaints"],
        pivots: [
          {
            kind: "ticket" as const,
            id: "",
            label: "Active Passes",
            href: isFaculty ? undefined : `/permissions?q=student:${id}`,
          },
        ],
        actions: [
          {
            id: "view-full",
            label: "Open Full Record",
            intent: "navigate",
            href: `/admin/${isFaculty ? "faculty" : "students"}/${id}`,
          },
        ],
        fullPageHref: `/admin/${isFaculty ? "faculty" : "students"}/${id}`,
      };
    }

    if (tier === "tier-3") {
      return {
        tier,
        mode: "act",
        perceptionTitle: "Full Institutional Record",
        whyRoleIsHere: `Complete profile for ${record.name ?? roll}: edit details, toggle status, or inspect movement & pass history.`,
        sections: [
          "identity",
          "attendance",
          "active-passes",
          "movement-history",
          "guardian-link",
          "audit",
        ],
        pivots: [],
        actions: [
          {
            id: "edit",
            label: "Edit Details",
            intent: "primary",
            href: `/admin/${isFaculty ? "faculty" : "students"}/${id}/edit`,
          },
          {
            id: "toggle-status",
            label: "Toggle Status",
            intent: "secondary",
            href: `/admin/${isFaculty ? "faculty" : "students"}/${id}`,
          },
          {
            id: "movement",
            label: "Movement & Pass History",
            intent: "navigate",
            href: `/admin/students/${id}/movements`,
          },
        ],
        fullPageHref: `/admin/${isFaculty ? "faculty" : "students"}/${id}`,
      };
    }

    // Tier 4: SysAdmin
    return {
      tier: "tier-4",
      mode: "sys-trace",
      perceptionTitle: "Account & Security Posture",
      whyRoleIsHere: `Diagnostic view for ${record.name ?? roll}: manage credentials, sessions, flags, and audit trail.`,
      sections: ["identity", "active-sessions", "flags", "audit"],
      pivots: [],
      actions: [
        {
          id: "access-keys",
          label: "Generate / Revoke Access Key",
          intent: "secondary",
          href: "/sysadmin/access-keys",
        },
        {
          id: "link-guardian",
          label: "Link Guardian / Set Flag",
          intent: "secondary",
          href: `/sysadmin/${isFaculty ? "staff" : "students"}`,
        },
        {
          id: "sessions",
          label: "Revoke Active Sessions",
          intent: "danger",
          href: "/sysadmin/sessions",
        },
        {
          id: "audit",
          label: "Audit Logs",
          intent: "navigate",
          href: "/sysadmin/audit",
        },
      ],
      fullPageHref: `/sysadmin/${isFaculty ? "faculty" : "students"}`,
    };
  }

  /* ── 5. DEVICE / SYSTEM ───────────────────────────────────────────────── */
  if (kind === "device") {
    const status = String(record.status ?? "ACTIVE").toUpperCase();
    const isDown = status === "OFFLINE" || status === "MAINTENANCE";

    return {
      tier: "tier-4",
      mode: "sys-trace",
      perceptionTitle: "Device Health & Configuration",
      whyRoleIsHere: isDown
        ? `Device "${record.name ?? id}" is ${status} — investigate and restore.`
        : `Device "${record.name ?? id}" is ${status} — manage configuration and firmware.`,
      sections: ["device-status", "firmware", "audit"],
      pivots: [],
      actions: [
        {
          id: "config",
          label: "Device Configuration",
          intent: "primary",
          href: "/admin/gate-device-configuration",
        },
        {
          id: "audit",
          label: "Audit Logs",
          intent: "navigate",
          href: "/sysadmin/audit",
        },
      ],
      fullPageHref: "/admin/gate-device-configuration",
    };
  }

  /* ── DEFAULT FALLBACK ─────────────────────────────────────────────────── */
  return {
    tier,
    mode:
      tier === "tier-4"
        ? "sys-trace"
        : tier === "tier-0"
          ? "self-loop"
          : "observe",
    perceptionTitle: `${String(kind).toUpperCase()} Record (${tier.toUpperCase()})`,
    whyRoleIsHere: "Connected entity view scoped to your role permissions.",
    sections: ["overview", "history"],
    pivots: [],
    actions: [],
    fullPageHref:
      ["admin", "sysadmin"].includes(role) &&
      ["student", "faculty", "gate"].includes(kind)
        ? `/admin/${kind === "faculty" ? "faculty" : `${kind}s`}/${id}`
        : null,
  };
}
