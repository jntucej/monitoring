import type { NavEntry } from "@/components/shell/types";
// src/app/exam/superintendent/_shell/nav.ts
import {
  LayoutDashboard, DoorOpen, CalendarClock,
  Siren, FileBarChart,
} from "lucide-react";

export const EXAM_SUPER_NAV: NavEntry[] = [
  { kind: "link", href: "/exam/superintendent", label: "Today", icon: LayoutDashboard },
  { kind: "link", href: "/exam/superintendent/access", label: "Access", icon: DoorOpen },
  { kind: "link", href: "/exam/superintendent/schedule", label: "Schedule", icon: CalendarClock },
  { kind: "link", href: "/exam/superintendent/incidents", label: "Incidents", icon: Siren },
  { kind: "link", href: "/exam/superintendent/reports", label: "Reports", icon: FileBarChart },
];
export const NAV_STORAGE_KEY = "exam-superintendent-nav-expanded";
