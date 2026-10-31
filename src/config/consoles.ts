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
};

export function getConsoleConfig(role: string): RoleConsoleConfig | undefined {
  return CONSOLES[role];
}
