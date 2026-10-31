import type { NavEntry } from "@/components/shell/types";
// src/app/(mess)/mess/_shell/nav.ts
import {
  LayoutDashboard, CalendarDays, Package, AlertCircle, UtensilsCrossed,
} from "lucide-react";

export const MESS_NAV: NavEntry[] = [
  { kind: "link", href: "/mess", label: "Today", icon: LayoutDashboard },
  {
    kind: "group", id: "meals", label: "Meals", icon: CalendarDays,
    children: [
      { href: "/mess/menu-management", label: "Menu" },
      { href: "/mess/daily-meal-counts", label: "Daily counts" },
      { href: "/mess/meal-attendance", label: "Attendance" },
      { href: "/mess/consumption-reports", label: "Consumption" },
    ],
  },
  {
    kind: "group", id: "inventory", label: "Inventory", icon: Package,
    children: [
      { href: "/mess/inventory-stock", label: "Stock" },
      { href: "/mess/special-events", label: "Special events" },
      { href: "/mess/reviews", label: "Reviews" },
    ],
  },
  {
    kind: "group", id: "ops", label: "Operations", icon: AlertCircle,
    children: [
      { href: "/mess/mess-issues", label: "Issues" },
      { href: "/mess/operational-requests", label: "Requests" },
      { href: "/mess/verify-token", label: "Verify token" },
      { href: "/mess/scan", label: "Scan" },
    ],
  },
];
export const NAV_STORAGE_KEY = "mess-nav-expanded";
