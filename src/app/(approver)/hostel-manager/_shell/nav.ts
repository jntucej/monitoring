import type { NavEntry, NavGroup } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
import {
  LayoutDashboard, Ticket, Building2, Users,
} from "lucide-react";

export const HOSTEL_MANAGER_NAV: NavEntry[] = [
  { kind: "link", href: "/hostel-manager", label: "Today", icon: LayoutDashboard },
  {
    kind: "group", id: "tickets", label: "Tickets", icon: Ticket,
    children: [
      { href: "/hostel-manager/tickets", label: "Resident tickets" },
      { href: "/hostel-manager/complaints", label: "Complaints" },
    ],
  },
  {
    kind: "group", id: "operations", label: "Operations", icon: Building2,
    children: [
      { href: "/hostel-manager/housekeeping-tasks", label: "Housekeeping" },
      { href: "/hostel-manager/resource-management", label: "Resources" },
      { href: "/hostel-manager/maintenance", label: "Maintenance" },
    ],
  },
  {
    kind: "group", id: "residents", label: "Residents", icon: Users,
    children: [
      { href: "/hostel-manager/residents", label: "All residents" },
      { href: "/hostel-manager/rooms", label: "Rooms" },
      { href: "/hostel-manager/allocation", label: "Allocation" },
    ],
  },
];

export const HOSTEL_MANAGER_GROUPS: IconRailGroup[] = HOSTEL_MANAGER_NAV.filter(
  (e): e is NavGroup => e.kind === "group"
);

export const NAV_STORAGE_KEY = "hostel-manager-nav-expanded";
