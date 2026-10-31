import {
  LayoutDashboard,
  CheckSquare,
  GraduationCap,
  FileText,
  History,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export interface VPLink {
  kind: "link";
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface VPGroup {
  kind: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  children: Array<{ href: string; label: string }>;
}

export type VPEntry = VPLink | VPGroup;

export const VP_NAV: VPEntry[] = [
  {
    kind: "link",
    href: "/vice-principal",
    label: "Today",
    icon: LayoutDashboard,
  },
  {
    kind: "group",
    id: "approvals",
    label: "Approvals",
    icon: CheckSquare,
    children: [
      { href: "/vice-principal/approvals/pending", label: "Pending" },
      { href: "/vice-principal/approvals/escalated", label: "Escalated" },
      { href: "/vice-principal/approvals/all", label: "All open" },
    ],
  },
  {
    kind: "group",
    id: "academics",
    label: "Academics",
    icon: GraduationCap,
    children: [
      { href: "/vice-principal/academics/departments", label: "Departments" },
      { href: "/vice-principal/academics/exceptions", label: "Exceptions" },
    ],
  },
  {
    kind: "link",
    href: "/vice-principal/examinations",
    label: "Examinations",
    icon: FileText,
  },
  {
    kind: "group",
    id: "history",
    label: "History",
    icon: History,
    children: [
      { href: "/vice-principal/history/7-days", label: "Last 7 days" },
      { href: "/vice-principal/history/30-days", label: "Last 30 days" },
      { href: "/vice-principal/history/90-days", label: "Last 90 days" },
    ],
  },
  {
    kind: "link",
    href: "/vice-principal/profile",
    label: "Profile",
    icon: UserCog,
  },
];

/** True when the current URL is the link OR a descendant of it. */
export function isPathActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/vice-principal") return pathname === "/vice-principal";
  return pathname === href || pathname.startsWith(href + "/");
}

/** True when any child of the group is the current URL. */
export function isGroupActive(
  pathname: string | null,
  group: VPGroup
): boolean {
  return group.children.some((c) => isPathActive(pathname, c.href));
}

export const NAV_STORAGE_KEY = "vp-nav-expanded";
