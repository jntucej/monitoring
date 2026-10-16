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
  | "exceptions";

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
  | "examDay";

export interface RoleConsoleConfig {
  role: string;
  /** Top-level nav destinations (icons only, no labels in the rail). */
  nav: string[];
  /** Render the 28px live status strip above the scanner viewfinder. */
  statusStrip: boolean;
  /** Render RecentScans as a swipe-up / swipe-down bottom sheet. */
  recentSheet: boolean;
  /**
   * Board source (optional, legacy). When present the RoleConsole shell
   * drives a Board feed, KanbanBoard, or StatusBar from this endpoint.
   */
  board?: {
    kind: "feed" | "kanban" | "grid";
    source: string;
    itemKey: string;
    /** Kanban columns, e.g. ["PENDING", "APPROVED", "REJECTED"]. */
    columns?: string[];
    /** Group-by field, used when kind === "grid". */
    groupBy?: string;
  };
  /** Entity type the ContextPanel renders on row click. */
  contextEntity?: "scan" | "person" | "ticket" | "permission";
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
    nav: ["scan", "log", "flags", "more"],
    statusStrip: true,
    recentSheet: true,
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
    nav: ["work-orders", "facilities", "faults", "history"],
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
};

export function getConsoleConfig(role: string): RoleConsoleConfig | undefined {
  return CONSOLES[role];
}
