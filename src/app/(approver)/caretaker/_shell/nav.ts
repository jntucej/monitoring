import type { NavEntry, NavGroup } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
import {
  LayoutDashboard, AlertCircle, Home,
} from "lucide-react";

export const CARETAKER_NAV: NavEntry[] = [
  { kind: "link", href: "/caretaker", label: "Today", icon: LayoutDashboard },
  {
    kind: "group",
    id: "tickets",
    label: "Tickets",
    icon: AlertCircle,
    children: [
      { href: "/caretaker/complaints", label: "Complaints" },
      { href: "/caretaker/maintenance", label: "Maintenance" },
    ],
  },
  {
    kind: "group",
    id: "facilities",
    label: "Facilities",
    icon: Home,
    children: [
      { href: "/caretaker/workers", label: "Workers" },
      { href: "/caretaker/buildings", label: "Buildings" },
    ],
  },
];

export const CARETAKER_GROUPS: IconRailGroup[] = CARETAKER_NAV.filter(
  (e): e is NavGroup => e.kind === "group"
);

export const NAV_STORAGE_KEY = "caretaker-nav-expanded";
