import type { NavEntry } from "@/components/shell/types";
// src/app/(approver)/faculty/subject/_shell/nav.ts
import { LayoutDashboard, BookOpen, ClipboardList } from "lucide-react";

export const SUBJECT_FACULTY_NAV: NavEntry[] = [
  { kind: "link", href: "/faculty/subject", label: "Today", icon: LayoutDashboard },
  { kind: "link", href: "/faculty/subject/classes", label: "My classes", icon: BookOpen },
  { kind: "link", href: "/faculty/subject/attendance", label: "Attendance", icon: ClipboardList },
];
export const NAV_STORAGE_KEY = "subject-faculty-nav-expanded";
