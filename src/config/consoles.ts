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
  | "lookup";

export type ConsoleStatusField =
  | "gate"
  | "entries"
  | "exits"
  | "shift"
  | "lastScan";

export interface RoleConsoleConfig {
  role: string;
  /** Top-level nav destinations (icons only, no labels in the rail). */
  nav: string[];
  /** Render the 28px live status strip above the scanner viewfinder. */
  statusStrip: boolean;
  /** Render RecentScans as a swipe-up / swipe-down bottom sheet. */
  recentSheet: boolean;
  /**
   * Board feed source (optional, legacy). When present the RoleConsole shell
   * drives a Board feed + StatusBar from this endpoint; the lean operator
   * kiosk does not set it and the rail falls back to children.
   */
  board?: {
    kind: "feed";
    source: string;
    itemKey: string;
  };
  /** Entity type the ContextPanel renders on row click (legacy). */
  contextEntity?: "scan" | "person" | "ticket";
  /** Command palette actions (legacy Cmd+K CommandBar). */
  commands?: ConsoleCommand[];
  /** Status-bar fields, rendered left-to-right (legacy). */
  statusFields?: ConsoleStatusField[];
}

export const CONSOLES: Record<string, RoleConsoleConfig> = {
  operator: {
    role: "operator",
    nav: ["scan", "log", "flags", "more"],
    statusStrip: true,
    recentSheet: true,
  },
};

export function getConsoleConfig(role: string): RoleConsoleConfig | undefined {
  return CONSOLES[role];
}
