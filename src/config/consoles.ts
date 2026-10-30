/**
 * Role console configurations for the lean gate-desk shell.
 *
 * Each entry describes how a role's scanner/ops surface renders:
 *   - nav: the small set of top-level destinations (rendered as an icon rail)
 *   - statusStrip: show the 28px live status strip above the kiosk viewfinder
 *   - recentSheet: render RecentScans as a swipe-up bottom sheet, not a tab
 *
 * Only the `operator` role is configured here; it drives the gate kiosk.
 * Other roles keep their existing dashboard layouts.
 */

export type ConsoleCommand =
  | "scan"
  | "manual-entry"
  | "pass-verify"
  | "lookup"
  | "approve"
  | "reject"
  | "escalate"
  | "forward"
  | "delegate"
  | "department-stats"
  | "attendance"
  | "mark-all-present"
  | "view-roster"
  | "clock-in"
  | "clock-out"
  | "request-leave"
  | "view-tasks"
  | "assign"
  | "resolve"
  | "view-assets"
  | "allocate"
  | "view-residents"
  | "day-access"
  | "exceptions"
  | "incident"
  | "candidates"
  | "teams"
  | "records"
  | "timeline"
  | "notifications"
  | "fees"
  | "contact"
  | "meals"
  | "inventory"
  | "requests"
  | "records"
  | "reports"
  | "verify"
  | "oie-handoff"
  | "discrepancies"
  | "health"
  | "services"
  | "deployments"
  | "backup"
  | "audit"
  | "dashboard"
  | "delegations"
  | "approvals"
  | "checkin"
  | "approval"
  | "history"
  | "host"
  | "request"
  | "alerts"
  | "announcements"
  | "finalize"
  | "revoke"
  | "count"
  | "menu"
  | "issue"
  | "handover"
  | "my-work"
  | "shifts"
  | "work-orders"
  | "history"
  | "records";

export type ConsoleStatusField =
  | "gate"
  | "entries"
  | "exits"
  | "shift"
  | "lastScan"
  | "pending"
  | "escalated"
  | "department-attendance"
  | "tasks"
  | "leaves"
  | "hostel"
  | "open"
  | "urgent"
  | "lastUpdate"
  | "gateStatus"
  | "openTickets"
  | "occupancy"
  | "maintenance"
  | "queue"
  | "exceptions"
  | "examDay"
  | "halls"
  | "incidents"
  | "candidates"
  | "escalations"
  | "critical"
  | "active"
  | "children"
  | "activities"
  | "unread"
  | "feesDue"
  | "meals"
  | "branch"
  | "handoff"
  | "discrepancies"
  | "records"
  | "alerts"
  | "delegations"
  | "pending"
  | "active"
  | "records";

export interface RoleConsoleConfig {
  role: string;
  /** Top-level nav destinations (icons only, no labels in the rail). */
  nav: string[];
  /** Render the 28px live status strip above the scanner viewfinder. */
  statusStrip: boolean;
  /** Render RecentScans as a swipe-up / swipe-down bottom sheet. */
  recentSheet: boolean;
  /**
   * Opt-in "Ops Console" top header. Only operator/supervisor desks need this;
   * every other role renders no header by default.
   */
  opsHeader?: boolean;
  /**
   * Board source (optional, legacy). When present the RoleConsole shell
   * drives a Board feed, KanbanBoard, or StatusBar from this endpoint.
   */
  board?: {
    kind: "feed" | "kanban" | "grid" | "digest";
    source: string;
    itemKey: string;
    /** Kanban columns, e.g. ["PENDING", "APPROVED", "REJECTED"]. */
    columns?: string[];
    /** Group-by field, used when kind === "grid". */
    groupBy?: string;
  };
  /** Entity type the ContextPanel renders on row click. */
  contextEntity?: "scan" | "person" | "ticket" | "permission" | "escalation" | "activity";
  /** Command palette actions. */
  commands?: ConsoleCommand[];
  /** Status-bar fields, rendered left-to-right. */
  statusFields?: ConsoleStatusField[];
  /**
   * Extra panels rendered in the main column alongside the board
   * (e.g. "AllocationPanel" for the hostel manager's room-bed surface).
   */
  extraPanels?: string[];
}

export const CONSOLES: Record<string, RoleConsoleConfig> = {
  operator: {
    role: "operator",
    opsHeader: true,
    nav: ["scan", "log", "flags", "more"],
    statusStrip: true,
    recentSheet: true,
    board: {
      kind: "feed",
      source: "/api/operator/transactions",
      itemKey: "transactions",
    },
    contextEntity: "scan",
    commands: ["scan", "manual-entry", "pass-verify", "lookup"],
    statusFields: ["gate", "entries", "exits", "shift", "lastScan"],
  },
  hod: {
    role: "hod",
    nav: ["approvals", "department", "faculty", "reports", "escalations", "directory"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "kanban",
      source: "/api/permissions",
      itemKey: "permission",
      columns: ["PENDING", "APPROVED", "REJECTED"],
    },
    contextEntity: "permission",
    commands: ["approve", "reject", "escalate", "department-stats"],
    statusFields: ["pending", "escalated", "department-attendance"],
  },
  class_teacher: {
    role: "class_teacher",
    nav: ["approvals", "class", "attendance", "reports"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "kanban",
      source: "/api/permissions?status=PENDING&stage=hod",
      itemKey: "permission",
      columns: ["PENDING", "APPROVED", "REJECTED"],
    },
    contextEntity: "permission",
    commands: ["approve", "reject", "attendance", "lookup"],
    statusFields: ["pending", "department-attendance"],
  },
  subject_faculty: {
    role: "subject_faculty",
    nav: ["my-subject", "roster", "attendance"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "feed",
      source: "/api/permissions?status=PENDING",
      itemKey: "permission",
    },
    contextEntity: "permission",
    commands: ["attendance", "mark-all-present", "view-roster"],
    statusFields: ["tasks", "department-attendance"],
  },
  staff: {
    role: "staff",
    nav: ["my-day", "duties", "leaves", "history"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "feed",
      source: "/api/staff/my-day",
      itemKey: "task",
    },
    contextEntity: "person",
    commands: ["clock-in", "clock-out", "request-leave", "view-tasks"],
    statusFields: ["shift", "tasks", "leaves"],
  },
  caretaker: {
    role: "caretaker",
    nav: ["overview", "maintenance", "workers"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "grid",
      source: "/api/caretaker/summary",
      itemKey: "ticket",
      groupBy: "status",
    },
    contextEntity: "ticket",
    commands: ["assign", "resolve", "escalate", "view-assets"],
    statusFields: ["hostel", "open", "urgent", "lastUpdate"],
  },
  deputy_warden: {
    role: "deputy_warden",
    nav: ["approvals", "gate-movement", "attendance", "shifts", "history"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "kanban",
      // Role-scoped source (NO explicit ?stage= param): the /api/permissions
      // role-based path sets current_stage = role (deputy_warden) AND
      // auto-derives the caller's users.hostel_scope, so the board is
      // scoped to the caller's hostel. An explicit ?stage= would bypass the
      // role-based hostel scoping (returns early before it runs).
      source: "/api/permissions",
      itemKey: "permission",
      columns: ["PENDING", "ESCALATED", "APPROVED"],
    },
    contextEntity: "permission",
    commands: ["approve", "reject", "forward", "escalate", "delegate"],
    statusFields: ["hostel", "pending", "escalated", "gateStatus"],
  },
  hostel_manager: {
    role: "hostel_manager",
    nav: ["tickets", "allocation", "residents", "resources", "reports"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "kanban",
      // Role-scoped source: /api/hostel-manager/summary self-scopes open
      // tickets by the caller's hostel_scope (boys/girls/both) and the
      // hostel_manager stage. Response shape:
      //   { success, data: { role, pendingCount, pendingTickets, hostelScope, notes } }
      // so the board items live under data.pendingTickets.
      source: "/api/hostel-manager/summary",
      itemKey: "pendingTickets",
      columns: ["OPEN", "IN_PROGRESS", "RESOLVED"],
    },
    contextEntity: "ticket",
    commands: ["assign", "resolve", "allocate", "escalate", "view-residents"],
    statusFields: ["hostel", "openTickets", "occupancy", "maintenance"],
    extraPanels: ["AllocationPanel"],
  },
  oie: {
    role: "oie",
    nav: ["queue", "candidates", "access", "exceptions", "records"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "kanban",
      // Role-scoped source: /api/oie/queue is the OIE exam-desk feed. It
      // self-filters to workflow_type=exam and to the caller's viewable exam
      // stages (oie / vice_principal / principal / completed for the oie role),
      // so the board is exam-scoped only (no hostel, no department).
      // Response shape: { success, data: FeedRow[], total, chain, myStage } —
      // the records live flat directly under `data` (like /api/permissions),
      // so the board items use the flat "permission" itemKey.
      source: "/api/oie/queue",
      itemKey: "permission",
      columns: ["PENDING", "ESCALATED", "APPROVED"],
    },
    contextEntity: "permission",
    commands: ["approve", "reject", "forward", "day-access", "exceptions"],
    statusFields: ["queue", "pending", "exceptions", "examDay"],
    extraPanels: ["ExamDayPanel"],
  },
  exam_superintendent: {
    role: "exam_superintendent",
    nav: ["access", "schedule", "incidents", "reports", "candidates"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "kanban",
      source: "/api/exam/access",
      itemKey: "permission",
      columns: ["PENDING", "ACTIVE", "CLOSED"],
    },
    contextEntity: "permission",
    commands: ["approve", "reject", "day-access", "incident", "candidates"],
    statusFields: ["examDay", "halls", "incidents", "candidates"],
    extraPanels: ["IncidentPanel"],
  },
  supervisor: {
    role: "supervisor",
    opsHeader: true,
    nav: ["live", "escalations", "gates", "shifts", "reports"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "digest",
      source: "/api/supervisor/escalations",
      itemKey: "escalation",
    },
    contextEntity: "escalation",
    commands: ["approve", "escalate", "assign", "resolve", "handover"],
    statusFields: ["escalations", "pending", "critical", "active"],
    extraPanels: ["EscalationPanel"],
  },
  parent: {
    role: "parent",
    nav: ["timeline", "notifications", "fees", "records", "contact"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "feed",
      // Role-scoped source: /api/parents/me self-scopes to the caller's own
      // linked children (getLinkedPersons(userId, "children_of")). Response
      // shape: { success, data: { children: ChildRow[], totalOpenRequests } }
      // so the feed items live under data.children. A child-activity timeline
      // is a chronologically-rendered feed variant; the `feed` kind already
      // sorts rows newest-first, so no dedicated timeline renderer is needed.
      source: "/api/parents/me",
      itemKey: "activity",
    },
    contextEntity: "activity",
    commands: ["timeline", "notifications", "fees", "records", "contact"],
    statusFields: ["children", "activities", "unread", "feesDue"],
    extraPanels: ["ChildActivityPanel"],
  },
  mess_incharge: {
    role: "mess_incharge",
    nav: ["today", "menu", "counts", "inventory", "issues", "special-events", "verify-token", "reviews"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "digest",
      // Digest-shaped endpoint: /api/mess/analytics returns data as a
      // named-key object (notSelected/declaredPresent/confirmedPresent/
      // byPrimary/byHostelBlock), NOT a flat array. The DigestBoard renders
      // these keys generically; the status bar + MealServePanel read the
      // same digest fields directly.
      source: "/api/mess/analytics",
      itemKey: "summary",
    },
    // The contextEntity union doesn't include "messDay" yet — "ticket" stands
    // in for now so the ticket ContextPanel renders on row click.
    contextEntity: "ticket",
    commands: ["finalize", "revoke", "count", "menu", "issue"],
    statusFields: ["meals", "pending", "active", "records"],
    extraPanels: ["MealServePanel"],
  },
  exam_branch: {
    role: "exam_branch",
    nav: ["queue", "oie-handoff", "discrepancies", "records", "reports"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "kanban",
      // Self-scoped exam-branch source: /api/permissions self-resolves the
      // caller's own branch (employee_details.department_id / users.department_id)
      // and returns only exam workflow tickets in that branch. `:self` is a
      // placeholder token; the server guards against cross-branch reads.
      source: "/api/permissions?workflow_type=exam&branch=:self",
      itemKey: "permission",
      columns: ["PENDING", "FORWARDED", "APPROVED"],
    },
    contextEntity: "permission",
    commands: ["verify", "forward", "oie-handoff", "records", "discrepancies"],
    statusFields: ["branch", "pending", "handoff", "discrepancies"],
    extraPanels: ["HandoffPanel"],
  },
  principal: {
    role: "principal",
    nav: ["dashboard", "delegations", "audit", "reports", "approvals"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "digest",
      // Digest-shaped endpoint: /api/principal/dashboard returns data as a
      // named-key object (pendingApprovals/recentAlerts/campusOccupancy),
      // NOT a flat array. The DigestBoard renders these keys generically;
      // the PrincipalDashboardPanel + status bar read the same digest
      // fields directly.
      source: "/api/principal/dashboard",
      itemKey: "item",
    },
    contextEntity: "ticket",
    commands: ["dashboard", "delegations", "audit", "reports", "approvals"],
    statusFields: ["alerts", "pending", "active", "records"],
    extraPanels: ["PrincipalDashboardPanel"],
  },
  sysadmin: {
    role: "sysadmin",
    nav: ["health", "services", "deployments", "backup", "audit"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "digest",
      // Digest-shaped endpoint: /api/sysadmin/application-health returns
      // data as a named-key object (status/timestamp/uptimeSeconds/metrics/
      // services/database), NOT a flat array. The DigestBoard renders these
      // keys generically; the SysadminHealthPanel + status bar read the same
      // digest fields directly.
      source: "/api/sysadmin/application-health",
      itemKey: "health",
    },
    contextEntity: "ticket",
    commands: ["health", "services", "deployments", "backup", "audit"],
    statusFields: ["alerts", "pending", "active", "records"],
    extraPanels: ["SysadminHealthPanel"],
  },
  vice_principal: {
    role: "vice_principal",
    nav: ["approvals", "delegations", "audit", "reports", "records"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "digest",
      // Digest-shaped endpoint: /api/principal/dashboard returns data as a
      // named-key object (pendingApprovals/recentAlerts/campusOccupancy),
      // NOT a flat array. The DigestBoard renders these keys generically;
      // the VpDashboardPanel + status bar read the same digest fields
      // directly.
      source: "/api/principal/dashboard",
      itemKey: "item",
    },
    contextEntity: "ticket",
    commands: ["approvals", "delegations", "audit", "reports", "records"],
    statusFields: ["alerts", "pending", "active", "records"],
    extraPanels: ["VpDashboardPanel"],
  },
  admin: {
    role: "admin",
    nav: ["alerts", "announcements", "audit", "backup", "reports"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "feed",
      source: "/api/admin/alerts",
      itemKey: "alert",
    },
    contextEntity: "ticket",
    commands: ["alerts", "announcements", "audit", "backup", "reports"],
    statusFields: ["alerts", "pending", "active", "records"],
    extraPanels: ["AdminAlertsPanel"],
  },
  worker: {
    role: "worker",
    nav: ["my-work", "shifts", "work-orders", "history", "records"],
    statusStrip: false,
    recentSheet: false,
    board: {
      kind: "digest",
      // Digest-shaped endpoint: /api/workers/my-work returns data as a
      // named-key object (tasks / completedLastWeek / todayShift), NOT a
      // flat array. The DigestBoard renders these keys generically; the
      // WorkerStatusBar + MyWorkPanel read the same digest fields directly.
      source: "/api/workers/my-work",
      itemKey: "work",
    },
    contextEntity: "ticket",
    commands: ["my-work", "shifts", "work-orders", "history", "records"],
    statusFields: ["pending", "active", "records", "lastUpdate"],
    extraPanels: ["MyWorkPanel"],
  },
};

export function getConsoleConfig(role: string): RoleConsoleConfig | undefined {
  return CONSOLES[role];
}
