import type { NavEntry } from "@/components/shell/types";
// src/app/(operator)/worker/_shell/nav.ts
import { LayoutDashboard, Clock, ClipboardList, History } from "lucide-react";

export const WORKER_NAV: NavEntry[] = [
  { kind: "link", href: "/worker", label: "Today", icon: LayoutDashboard },
  { kind: "link", href: "/worker/shifts", label: "Shifts", icon: Clock },
  { kind: "link", href: "/worker/work-orders", label: "Work orders", icon: ClipboardList },
  { kind: "link", href: "/worker/history", label: "History", icon: History },
];
export const NAV_STORAGE_KEY = "worker-nav-expanded";
