import type { LucideIcon } from "lucide-react";
import type React from "react";

/**
 * P1: the minimal context a nav item's `when(ctx)` predicate is evaluated
 * against. This is the shell's view of the workspace context — it carries
 * just what nav filtering needs (residential status + campus presence).
 * The full WorkspaceContext lives in config/roles/types; this is the
 * client-side slice.
 */
export interface NavContext {
  roles: string[];
  personType: string;
  residentialStatus: "hosteller" | "day_scholar" | "n_a";
  campusStatus: "in_campus" | "out_campus" | "unknown";
}

export interface NavLink {
  kind: "link";
  href: string;
  label: string;
  icon: LucideIcon;
  /** P1: pure predicate — show this link only when true. Omit → always show. */
  when?: (ctx: NavContext) => boolean;
}

export interface NavChild {
  href: string;
  label: string;
  /** P1: pure predicate — show this child only when true. Omit → always show. */
  when?: (ctx: NavContext) => boolean;
}

export interface NavGroup {
  kind: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavChild[];
  /** P1: pure predicate — show this whole group only when true. Omit → always. */
  when?: (ctx: NavContext) => boolean;
}

export type NavEntry = NavLink | NavGroup;

export interface RoleManifest {
  role: string;
  brand: { short: string; long: string };
  rootHref: string;
  storageKey: string;
  nav: NavEntry[];
  /**
   * P1: the live context the sidebar evaluates `when(ctx)` against. The
   * manifest is static data; this is the per-session slice that makes the
   * same manifest render different nav for a day scholar vs a hosteller.
   */
  navContext?: NavContext;
  /** Optional footer slot (streak pills, focus-mode trigger). */
  footer?: React.ComponentType;
  /** When false, the sidebar footer omits the "Account settings" profile link
   *  (set for roles whose console has no /{role}/profile route). */
  hasProfile?: boolean;
}
