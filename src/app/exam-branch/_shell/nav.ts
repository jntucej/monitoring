import type { NavEntry, NavGroup } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
import {
  LayoutDashboard, ClipboardList, FileText,
  BookOpen,
} from "lucide-react";

export const EXAM_BRANCH_NAV: NavEntry[] = [
  { kind: "link", href: "/exam-branch", label: "Today", icon: LayoutDashboard },
  {
    kind: "group", id: "queue", label: "Exam queue", icon: ClipboardList,
    children: [
      { href: "/exam-branch/pass-queue", label: "Pass queue" },
      { href: "/exam-branch/oie-approval-requests", label: "OIE approvals" },
      { href: "/exam-branch/oie-handoff", label: "OIE handoff" },
    ],
  },
  {
    kind: "group", id: "records", label: "Records", icon: FileText,
    children: [
      { href: "/exam-branch/records", label: "Records" },
      { href: "/exam-branch/verification", label: "Verification" },
      { href: "/exam-branch/discrepancies", label: "Discrepancies" },
    ],
  },
  {
    kind: "group", id: "reference", label: "Reference", icon: BookOpen,
    children: [
      { href: "/exam-branch/calendar", label: "Calendar" },
      { href: "/exam-branch/docs", label: "Docs" },
      { href: "/exam-branch/reports", label: "Reports" },
    ],
  },
];

export const EXAM_BRANCH_GROUPS: IconRailGroup[] = EXAM_BRANCH_NAV.filter(
  (e): e is NavGroup => e.kind === "group"
);

export const NAV_STORAGE_KEY = "exam-branch-nav-expanded";
