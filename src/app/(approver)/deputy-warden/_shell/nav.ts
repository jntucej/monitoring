import type { NavEntry, NavGroup } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
import {
  LayoutDashboard, CheckSquare, Home, Clock,
} from "lucide-react";

export const DEPUTY_WARDEN_NAV: NavEntry[] = [
  { kind: "link", href: "/deputy-warden", label: "Today", icon: LayoutDashboard },
  {
    kind: "group",
    id: "approvals",
    label: "Approvals",
    icon: CheckSquare,
    children: [
      { href: "/deputy-warden/outpass-queue", label: "Outpass queue" },
      { href: "/deputy-warden/leave-requests", label: "Leave requests" },
      { href: "/deputy-warden/delegated-approvals", label: "Delegated" },
    ],
  },
  {
    kind: "group",
    id: "hostel",
    label: "Hostel",
    icon: Home,
    children: [
      { href: "/deputy-warden/daily-overview", label: "Overview" },
      { href: "/deputy-warden/gate-movement", label: "Gate movement" },
      { href: "/deputy-warden/curfew-oversight", label: "Curfew" },
    ],
  },
  {
    kind: "group",
    id: "operations",
    label: "Operations",
    icon: Clock,
    children: [
      { href: "/deputy-warden/incident-reporting", label: "Incidents" },
      { href: "/deputy-warden/shift-handover", label: "Handover" },
      { href: "/deputy-warden/decision-history", label: "Decision history" },
      { href: "/deputy-warden/complaints", label: "Complaints" },
    ],
  },
];

export const DEPUTY_WARDEN_GROUPS: IconRailGroup[] = DEPUTY_WARDEN_NAV.filter(
  (e): e is NavGroup => e.kind === "group"
);

export const NAV_STORAGE_KEY = "deputy-warden-nav-expanded";
