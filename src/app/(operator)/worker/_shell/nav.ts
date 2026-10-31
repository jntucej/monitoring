import type { NavEntry, NavGroup } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
import { LayoutDashboard, ClipboardList, History } from "lucide-react";

export const WORKER_NAV: NavEntry[] = [
  { kind: "link", href: "/worker", label: "Today", icon: LayoutDashboard },
  {
    kind: "group",
    id: "work",
    label: "Work",
    icon: ClipboardList,
    children: [
      { href: "/worker/shifts", label: "Shifts" },
      { href: "/worker/work-orders", label: "Work orders" },
    ],
  },
  {
    kind: "group",
    id: "records",
    label: "Records",
    icon: History,
    children: [
      { href: "/worker/history", label: "History" },
    ],
  },
];

export const WORKER_GROUPS: IconRailGroup[] = WORKER_NAV.filter(
  (e): e is NavGroup => e.kind === "group"
);

export const NAV_STORAGE_KEY = "worker-nav-expanded";
