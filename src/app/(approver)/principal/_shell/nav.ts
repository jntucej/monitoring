import {
  LayoutDashboard,
  CheckSquare,
  Users,
  DoorOpen,
  FileText,
  Scale,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export interface PrincipalLink {
  kind: "link";
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface PrincipalGroup {
  kind: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  children: Array<{ href: string; label: string }>;
}

export type PrincipalEntry = PrincipalLink | PrincipalGroup;

export const PRINCIPAL_NAV: PrincipalEntry[] = [
  { kind: "link", href: "/principal", label: "Today", icon: LayoutDashboard },
  {
    kind: "group",
    id: "approvals",
    label: "Approvals",
    icon: CheckSquare,
    children: [
      { href: "/principal/approvals/pending", label: "Pending" },
      { href: "/principal/approvals/escalated", label: "Escalated" },
      { href: "/principal/approvals/overdue", label: "Overdue" },
      { href: "/principal/approvals/delegated", label: "Delegated" },
    ],
  },
  {
    kind: "group",
    id: "people",
    label: "People",
    icon: Users,
    children: [
      { href: "/principal/people/departments", label: "Departments" },
      { href: "/principal/people/attendance", label: "Attendance" },
    ],
  },
  {
    kind: "group",
    id: "operations",
    label: "Operations",
    icon: DoorOpen,
    children: [
      { href: "/principal/operations/gates", label: "Gates" },
      { href: "/principal/operations/hostel", label: "Hostel" },
      { href: "/principal/operations/incidents", label: "Incidents" },
    ],
  },
  {
    kind: "link",
    href: "/principal/examinations",
    label: "Examinations",
    icon: FileText,
  },
  {
    kind: "group",
    id: "governance",
    label: "Governance",
    icon: Scale,
    children: [
      { href: "/principal/governance/audit", label: "Audit" },
      { href: "/principal/governance/delegations", label: "Delegations" },
      { href: "/principal/governance/analytics", label: "Analytics" },
      { href: "/principal/governance/reports", label: "Reports" },
    ],
  },
  { kind: "link", href: "/principal/profile", label: "Profile", icon: UserCog },
];

/** True when the current URL is the link OR a descendant of it. */
export function isPathActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/principal") return pathname === "/principal";
  return pathname === href || pathname.startsWith(href + "/");
}

/** True when any child of the group is the current URL. */
export function isGroupActive(
  pathname: string | null,
  group: PrincipalGroup
): boolean {
  return group.children.some((c) => isPathActive(pathname, c.href));
}

export const NAV_STORAGE_KEY = "principal-nav-expanded";
