import type { NavEntry, NavGroup } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
import {
  LayoutDashboard, CheckSquare, CalendarClock,
  ClipboardList,
} from "lucide-react";

export const OIE_NAV: NavEntry[] = [
  { kind: "link", href: "/oie", label: "Today", icon: LayoutDashboard },
  {
    kind: "group", id: "queue", label: "Exam queue", icon: CheckSquare,
    children: [
      { href: "/oie/queue/pending", label: "Pending" },
      { href: "/oie/queue/escalated", label: "Escalated" },
      { href: "/oie/queue/history", label: "History" },
    ],
  },
  {
    kind: "group", id: "operations", label: "Exam operations", icon: CalendarClock,
    children: [
      { href: "/oie/examination-day-access", label: "Day access" },
      { href: "/oie/access-exceptions", label: "Exceptions" },
      { href: "/oie/candidate-attendance", label: "Candidate attendance" },
      { href: "/oie/exam-branch-coordination", label: "Branch coordination" },
    ],
  },
  {
    kind: "group", id: "records", label: "Records", icon: ClipboardList,
    children: [
      { href: "/oie/records", label: "Records" },
      { href: "/oie/decision-history", label: "Decision history" },
      { href: "/oie/examination-reports", label: "Reports" },
    ],
  },
];

export const OIE_GROUPS: IconRailGroup[] = OIE_NAV.filter(
  (e): e is NavGroup => e.kind === "group"
);

export const NAV_STORAGE_KEY = "oie-nav-expanded";
