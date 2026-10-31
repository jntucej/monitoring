import type { NavEntry, NavGroup } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
import { LayoutDashboard, BookOpen } from "lucide-react";

export const SUBJECT_FACULTY_NAV: NavEntry[] = [
  { kind: "link", href: "/faculty/subject", label: "Today", icon: LayoutDashboard },
  {
    kind: "group",
    id: "teaching",
    label: "Teaching",
    icon: BookOpen,
    children: [
      { href: "/faculty/subject/classes", label: "My classes" },
      { href: "/faculty/subject/attendance", label: "Attendance" },
    ],
  },
];

export const SUBJECT_FACULTY_GROUPS: IconRailGroup[] = SUBJECT_FACULTY_NAV.filter(
  (e): e is NavGroup => e.kind === "group"
);

export const NAV_STORAGE_KEY = "subject-faculty-nav-expanded";
