/**
 * Role console configurations for the Ops Console shell.
 *
 * Each entry describes how a role's root dashboard renders inside the shared
 * <RoleConsole />: the feed source (board), the context entity opened on row
 * click, the command palette actions, and the status-bar fields.
 *
 * Only the `operator` role is migrated to the console shell in this PR; other
 * roles keep their existing dashboard layouts until they are migrated too.
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
  board: {
    kind: "feed";
    /**
     * The API endpoint that returns today's records for this role. The
     * response shape is `{ data: { transactions: T[] } }` (the ok() helper),
     * where `T` is the itemKey shape below.
     */
    source: string;
    /**
     * The nested key inside `data` that holds the record array.
     * "transactions" for /api/operator/transactions.
     */
    itemKey: string;
  };
  /** The entity type the ContextPanel renders on row click. */
  contextEntity: "scan" | "person" | "ticket";
  /** Command palette actions available to this role. */
  commands: ConsoleCommand[];
  /** Status-bar fields, rendered left-to-right. */
  statusFields: ConsoleStatusField[];
}

export const CONSOLES: Record<string, RoleConsoleConfig> = {
  operator: {
    role: "operator",
    board: {
      kind: "feed",
      source: "/api/operator/transactions",
      itemKey: "transactions",
    },
    contextEntity: "scan",
    commands: ["scan", "manual-entry", "pass-verify", "lookup"],
    statusFields: ["gate", "entries", "exits", "shift", "lastScan"],
  },
};

export function getConsoleConfig(role: string): RoleConsoleConfig | undefined {
  return CONSOLES[role];
}
