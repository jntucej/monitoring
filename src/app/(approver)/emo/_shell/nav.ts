import type { NavEntry } from "@/components/shell/types";
// src/app/(approver)/emo/_shell/nav.ts
import { LayoutDashboard, AlertCircle } from "lucide-react";

export const EMO_NAV: NavEntry[] = [
  { kind: "link", href: "/emo", label: "Today", icon: LayoutDashboard },
  { kind: "link", href: "/emo/complaints", label: "Complaints", icon: AlertCircle },
];
export const NAV_STORAGE_KEY = "emo-nav-expanded";
