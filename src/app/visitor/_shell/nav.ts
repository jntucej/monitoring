import type { NavEntry, NavGroup } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
import { Home, MapPin, History } from "lucide-react";

export const VISITOR_NAV: NavEntry[] = [
  { kind: "link", href: "/visitor", label: "Home", icon: Home },
  {
    kind: "group",
    id: "visit",
    label: "My visit",
    icon: MapPin,
    children: [
      { href: "/visitor/registration", label: "Registration" },
      { href: "/visitor/host-info", label: "Host info" },
      { href: "/visitor/approval-status", label: "Approval status" },
      { href: "/visitor/visit-details", label: "Visit details" },
      { href: "/visitor/checkin-out", label: "Check in/out" },
    ],
  },
  {
    kind: "group",
    id: "records",
    label: "Records",
    icon: History,
    children: [
      { href: "/visitor/history", label: "History" },
    ],
  },
];

export const VISITOR_GROUPS: IconRailGroup[] = VISITOR_NAV.filter(
  (e): e is NavGroup => e.kind === "group"
);

export const NAV_STORAGE_KEY = "visitor-nav-expanded";
