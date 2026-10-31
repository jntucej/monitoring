import type { NavEntry } from "@/components/shell/types";
// src/app/(approver)/faculty/_shell/nav.ts
import {
  LayoutDashboard, BookOpen, ClipboardList, CheckSquare, FileBarChart,
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
export const NAV_STORAGE_KEY = "faculty-nav-expanded";
