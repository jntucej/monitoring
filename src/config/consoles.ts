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
  | "department-stats";

export type ConsoleStatusField =
  | "gate"
  | "entries"
  | "exits"
  | "shift"
  | "lastScan"
  | "pending"
  | "escalated"
  | "department-attendance";

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
    kind: "feed" | "kanban";
    source: string;
    itemKey: string;
    /** Kanban columns, e.g. ["PENDING", "APPROVED", "REJECTED"]. */
    columns?: string[];
  };
  /** Entity type the ContextPanel renders on row click. */
  contextEntity?: "scan" | "person" | "ticket" | "permission";
  /** Command palette actions. */
  commands?: ConsoleCommand[];
  /** Status-bar fields, rendered left-to-right. */
  statusFields?: ConsoleStatusField[];
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
};

export function getConsoleConfig(role: string): RoleConsoleConfig | undefined {
  return CONSOLES[role];
}
