import type { NavEntry } from "@/components/shell/types";
// src/app/(approver)/deputy-warden/_shell/nav.ts
import {
  LayoutDashboard, CheckSquare, Home, Clock,
  AlertCircle, History, Users,
} from "lucide-react";

export const DEPUTY_WARDEN_NAV: NavEntry[] = [
  { kind: "link", href: "/deputy-warden", label: "Today", icon: LayoutDashboard },
  {
    kind: "group", id: "approvals", label: "Approvals", icon: CheckSquare,
    children: [
      { href: "/deputy-warden/outpass-queue", label: "Outpass queue" },
      { href: "/deputy-warden/leave-requests", label: "Leave requests" },
      { href: "/deputy-warden/delegated-approvals", label: "Delegated" },
    ],
  },
  {
    kind: "group", id: "hostel", label: "Hostel", icon: Home,
    children: [
      { href: "/deputy-warden/daily-overview", label: "Overview" },
      { href: "/deputy-warden/gate-movement", label: "Gate movement" },
      { href: "/deputy-warden/curfew-oversight", label: "Curfew" },
    ],
  },
  {
    kind: "group", id: "operations", label: "Operations", icon: Clock,
    children: [
      { href: "/deputy-warden/incident-reporting", label: "Incidents" },
      { href: "/deputy-warden/shift-handover", label: "Handover" },
      { href: "/deputy-warden/decision-history", label: "Decision history" },
    ],
  },
  { kind: "link", href: "/deputy-warden/complaints", label: "Complaints", icon: AlertCircle },
];
export const NAV_STORAGE_KEY = "deputy-warden-nav-expanded";
