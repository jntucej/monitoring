import type { NavEntry } from "@/components/shell/types";
// src/app/visitor/_shell/nav.ts
import { Home, MapPin, History } from "lucide-react";

export const VISITOR_NAV: NavEntry[] = [
  { kind: "link", href: "/visitor", label: "Home", icon: Home },
  {
    kind: "group", id: "visit", label: "My visit", icon: MapPin,
    children: [
      { href: "/visitor/registration", label: "Registration" },
      { href: "/visitor/host-info", label: "Host info" },
      { href: "/visitor/approval-status", label: "Approval status" },
      { href: "/visitor/visit-details", label: "Visit details" },
      { href: "/visitor/checkin-out", label: "Check in/out" },
    ],
  },
  { kind: "link", href: "/visitor/history", label: "History", icon: History },
];
export const NAV_STORAGE_KEY = "visitor-nav-expanded";
