import type { LucideIcon } from "lucide-react";
import type React from "react";

export interface NavLink {
  kind: "link";
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  kind: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  children: Array<{ href: string; label: string }>;
}

export type NavEntry = NavLink | NavGroup;

export interface RoleManifest {
  role: string;
  brand: { short: string; long: string };
  rootHref: string;
  storageKey: string;
  nav: NavEntry[];
  /** Optional footer slot (streak pills, focus-mode trigger). */
  footer?: React.ComponentType;
}
