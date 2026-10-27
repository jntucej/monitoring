/* ───────────────────────────────────────────────────────────────────────
 * src/contracts/console.ts
 * UI shell contract for the Ops Console (RoleConsole + 5 regions).
 * READ-ONLY for all agent groups. This file is the single source of
 * truth for the console config shape and the frozen component APIs.
 * ─────────────────────────────────────────────────────────────────────── */

import type * as React from "react";

// ─── Board kinds ─────────────────────────────────────────────────────────

export type BoardKind = "feed" | "kanban" | "grid" | "timeline" | "digest";

// ─── Board spec ──────────────────────────────────────────────────────────

export interface BoardSpec {
  kind: BoardKind;
  /** API path, may contain :params. */
  source: string;
  itemKey: "scan" | "permission" | "student" | "service" | "alert" | "messDay";
  /** Column titles, used when kind === "kanban". */
  columns?: string[];
  /** Group-by field, used when kind === "grid". */
  groupBy?: string;
}

// ─── Scope picker spec ──────────────────────────────────────────────────

export interface ScopePickerSpec {
  type: "class" | "dept-class" | "none";
  source: string;
  dimensions?: ("year" | "section")[];
  default?: "all" | "first";
}

// ─── Command spec ────────────────────────────────────────────────────────

export interface CommandSpec {
  id: string;
  label: string;
  /** Lucide icon name or emoji. */
  icon: string;
  /** Command-bar prefix, e.g. ">". */
  prefix?: string;
  /** REST endpoint the command executes against. */
  endpoint?: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** When true, the command asks for confirmation before executing. */
  confirm?: boolean;
}

// ─── Status field spec ──────────────────────────────────────────────────

export interface StatusFieldSpec {
  key: string;
  icon: string;
  label: string;
  /** API path or the literal string "store" (read from the client store). */
  source: string;
}

// ─── Nav item ────────────────────────────────────────────────────────────

export interface NavItemSpec {
  id: string;
  label: string;
  icon: string;
  href: string;
}

// ─── Console config (the shape stored in src/config/consoles.ts) ────────

export interface ConsoleConfig {
  role: string;
  scope: ScopePickerSpec;
  board: BoardSpec;
  contextEntity: "permission" | "scan" | "student" | "service" | "alert" | "messDay";
  commands: CommandSpec[];
  statusFields: StatusFieldSpec[];
  nav: NavItemSpec[];
  extraPanels?: string[];
}

// ─── Frozen shell component APIs ────────────────────────────────────────

export interface RoleConsoleProps {
  config: ConsoleConfig;
  /** Rendered inside the Board slot when board.kind === "custom". */
  children?: React.ReactNode;
}

export interface CommandBarProps {
  commands: CommandSpec[];
  onExecute: (cmd: CommandSpec, payload?: unknown) => void | Promise<void>;
  placeholder?: string;
}

export interface IconRailProps {
  items: NavItemSpec[];
  active: string;
  onSelect: (id: string) => void;
}

export interface BoardProps {
  spec: BoardSpec;
  data: unknown[];
  loading: boolean;
  error: string | null;
  onSelect: (item: unknown) => void;
}

export interface ContextPanelProps {
  entity: ConsoleConfig["contextEntity"];
  item: unknown | null;
  open: boolean;
  onClose: () => void;
  onAction?: (action: string, payload?: unknown) => void;
}

export interface StatusBarProps {
  fields: StatusFieldSpec[];
  values: Record<string, string | number>;
  health: "green" | "amber" | "red";
  onExpand: () => void;
}
