import {
  LayoutDashboard,
  CheckSquare,
  Users,
  GraduationCap,
  BookOpen,
  FileBarChart,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export interface HodLink {
  kind: "link";
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface HodGroup {
  kind: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  children: Array<{ href: string; label: string }>;
}

export type HodEntry = HodLink | HodGroup;

export const HOD_NAV: HodEntry[] = [
  { kind: "link", href: "/hod", label: "Today", icon: LayoutDashboard },
  {
    kind: "group",
    id: "approvals",
    label: "Approvals",
    icon: CheckSquare,
    children: [
      { href: "/hod/approvals/pending", label: "Pending" },
      { href: "/hod/approvals/escalated", label: "Escalated" },
    ],
  },
  {
    kind: "group",
    id: "faculty",
    label: "Faculty",
    icon: Users,
    children: [
      { href: "/hod/faculty/directory", label: "Directory" },
      { href: "/hod/faculty/attendance", label: "Attendance" },
    ],
  },
  { kind: "link", href: "/hod/students", label: "Students", icon: GraduationCap },
  { kind: "link", href: "/hod/classes", label: "Classes", icon: BookOpen },
  { kind: "link", href: "/hod/reports", label: "Reports", icon: FileBarChart },
  { kind: "link", href: "/hod/profile", label: "Profile", icon: UserCog },
];

export function isPathActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/hod") return pathname === "/hod";
  return pathname === href || pathname.startsWith(href + "/");
}

export function isGroupActive(pathname: string | null, group: HodGroup): boolean {
  return group.children.some((c) => isPathActive(pathname, c.href));
}

export const NAV_STORAGE_KEY = "hod-nav-expanded";
