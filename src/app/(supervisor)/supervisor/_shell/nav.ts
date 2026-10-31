import {
  LayoutDashboard,
  Clock,
  Users,
  DoorOpen,
  Siren,
  BarChart3,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import type { IconRailGroup } from "@/components/shared/IconRail";

export interface SupervisorLink {
  kind: "link";
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface SupervisorGroup {
  kind: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  children: Array<{ href: string; label: string }>;
}

export type SupervisorEntry = SupervisorLink | SupervisorGroup;

export const SUPERVISOR_NAV: SupervisorEntry[] = [
  { kind: "link", href: "/supervisor", label: "Today", icon: LayoutDashboard },
  {
    kind: "group",
    id: "shift",
    label: "Shift",
    icon: Clock,
    children: [
      { href: "/supervisor/shift/live", label: "Live shift" },
      { href: "/supervisor/shift/handover", label: "Handover" },
      { href: "/supervisor/shift/history", label: "Shift history" },
    ],
  },
  {
    kind: "group",
    id: "team",
    label: "Team",
    icon: Users,
    children: [
      { href: "/supervisor/team/workers", label: "Workers & Security" },
      { href: "/supervisor/team/shifts", label: "Shift assignments" },
      { href: "/supervisor/team/curfew", label: "Curfew" },
    ],
  },
  {
    kind: "group",
    id: "gates",
    label: "Gates",
    icon: DoorOpen,
    children: [
      { href: "/supervisor/gates/live", label: "Live status" },
      { href: "/supervisor/gates/activity", label: "Activity" },
      { href: "/supervisor/gates/wall", label: "Wall display" },
    ],
  },
  {
    kind: "group",
    id: "response",
    label: "Response",
    icon: Siren,
    children: [
      { href: "/supervisor/response/escalations", label: "Escalations" },
      { href: "/supervisor/response/incidents", label: "Incidents" },
      { href: "/supervisor/response/exceptions", label: "Exceptions" },
    ],
  },
  {
    kind: "group",
    id: "oversight",
    label: "Oversight",
    icon: BarChart3,
    children: [
      { href: "/supervisor/approvals", label: "Approvals" },
      { href: "/supervisor/reports", label: "Reports" },
    ],
  },
  {
    kind: "group",
    id: "account",
    label: "Account",
    icon: UserCog,
    children: [
      { href: "/supervisor/profile", label: "Profile" },
    ],
  },
];

export const SUPERVISOR_GROUPS: IconRailGroup[] = SUPERVISOR_NAV.filter(
  (e): e is SupervisorGroup => e.kind === "group"
);

export function isPathActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/supervisor") return pathname === "/supervisor";
  return pathname === href || pathname.startsWith(href + "/");
}

export function isGroupActive(
  pathname: string | null,
  group: SupervisorGroup
): boolean {
  return group.children.some((c) => isPathActive(pathname, c.href));
}

export const NAV_STORAGE_KEY = "supervisor-nav-expanded";
