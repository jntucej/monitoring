import type { NavEntry } from "@/components/shell/types";
// src/app/(approver)/caretaker/_shell/nav.ts
import {
  LayoutDashboard, AlertCircle, Wrench, Users, Home,
} from "lucide-react";

export const CARETAKER_NAV: NavEntry[] = [
  { kind: "link", href: "/caretaker", label: "Today", icon: LayoutDashboard },
  {
    kind: "group", id: "tickets", label: "Tickets", icon: AlertCircle,
    children: [
      { href: "/caretaker/complaints", label: "Complaints" },
      { href: "/caretaker/maintenance", label: "Maintenance" },
    ],
  },
  { kind: "link", href: "/caretaker/workers", label: "Workers", icon: Users },
  { kind: "link", href: "/caretaker/buildings", label: "Buildings", icon: Home },
];
export const NAV_STORAGE_KEY = "caretaker-nav-expanded";
