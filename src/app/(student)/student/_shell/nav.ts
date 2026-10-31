import type { NavEntry } from "@/components/shell/types";
// src/app/(student)/student/_shell/nav.ts
import {
  Home, CheckSquare, Plus, QrCode, UtensilsCrossed,
  Bell, UserCog, AlertCircle,
} from "lucide-react";

export const STUDENT_NAV: NavEntry[] = [
  { kind: "link", href: "/student", label: "Home", icon: Home },
  {
    kind: "group", id: "permissions", label: "Permissions", icon: CheckSquare,
    children: [
      { href: "/student/permissions", label: "My tickets" },
      { href: "/student/permissions/new", label: "New request" },
      { href: "/student/request-tracking", label: "Tracking" },
    ],
  },
  { kind: "link", href: "/student/id", label: "My ID", icon: QrCode },
  {
    kind: "group", id: "mess", label: "Mess", icon: UtensilsCrossed,
    children: [
      { href: "/student/mess/token", label: "Meal token" },
      { href: "/student/mess/reviews", label: "Reviews" },
      { href: "/student/mess/special", label: "Special" },
      { href: "/student/mess-bill", label: "Bill" },
    ],
  },
  {
    kind: "group", id: "support", label: "Support", icon: AlertCircle,
    children: [
      { href: "/student/complaints", label: "Complaints" },
      { href: "/student/anti-ragging", label: "Anti-ragging" },
    ],
  },
  {
    kind: "group", id: "account", label: "Account", icon: UserCog,
    children: [
      { href: "/student/notifications", label: "Notifications" },
      { href: "/student/profile", label: "Profile" },
    ],
  },
];
export const NAV_STORAGE_KEY = "student-nav-expanded";
