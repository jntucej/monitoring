import type { NavEntry, NavGroup } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
import {
  LayoutDashboard, BookOpen, CheckSquare, FileBarChart,
} from "lucide-react";

export const FACULTY_NAV: NavEntry[] = [
  { kind: "link", href: "/faculty", label: "Today", icon: LayoutDashboard },
  {
    kind: "group", id: "class", label: "My class", icon: BookOpen,
    children: [
      { href: "/faculty/my-classes", label: "My classes" },
      { href: "/faculty/attendance", label: "Attendance" },
      { href: "/faculty/student-directory", label: "Students" },
    ],
  },
  {
    kind: "group", id: "requests", label: "Requests", icon: CheckSquare,
    children: [
      { href: "/faculty/permissions", label: "Permissions" },
      { href: "/faculty/correction-requests", label: "Corrections" },
      { href: "/faculty/request-history", label: "Request history" },
    ],
  },
  {
    kind: "group", id: "misc", label: "More", icon: FileBarChart,
    children: [
      { href: "/faculty/reports", label: "Reports" },
      { href: "/faculty/notifications", label: "Notifications" },
    ],
  },
];

export const FACULTY_GROUPS: IconRailGroup[] = FACULTY_NAV.filter(
  (e): e is NavGroup => e.kind === "group"
);

export const NAV_STORAGE_KEY = "faculty-nav-expanded";
