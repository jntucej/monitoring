import type { NavEntry, NavGroup } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
import {
  LayoutDashboard, CalendarClock, FileBarChart, DoorOpen, Siren,
} from "lucide-react";

export const EXAM_SUPER_NAV: NavEntry[] = [
  { kind: "link", href: "/exam/superintendent", label: "Access desk", icon: DoorOpen },
  { kind: "link", href: "/exam/superintendent/home", label: "Today", icon: LayoutDashboard },
  {
    kind: "group",
    id: "operations",
    label: "Operations",
    icon: CalendarClock,
    children: [
      { href: "/exam/superintendent", label: "Queue" },
      { href: "/exam/superintendent/schedule", label: "Schedule" },
      { href: "/exam/superintendent/incidents", label: "Incidents" },
    ],
  },
  {
    kind: "group",
    id: "reports",
    label: "Reports",
    icon: FileBarChart,
    children: [
      { href: "/exam/superintendent/reports", label: "Reports" },
    ],
  },
];

export const EXAM_SUPER_GROUPS: IconRailGroup[] = EXAM_SUPER_NAV.filter(
  (e): e is NavGroup => e.kind === "group"
);

export const NAV_STORAGE_KEY = "exam-superintendent-nav-expanded";
