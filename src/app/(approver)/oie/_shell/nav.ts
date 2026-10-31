import type { NavEntry } from "@/components/shell/types";
// src/app/(approver)/oie/_shell/nav.ts
import {
  LayoutDashboard, CheckSquare, CalendarClock, DoorOpen,
  FileText, History, ClipboardList,
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
export const NAV_STORAGE_KEY = "oie-nav-expanded";
