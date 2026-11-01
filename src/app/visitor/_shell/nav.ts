import type { NavEntry, NavGroup } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
import { Home, MapPin } from "lucide-react";

export const VISITOR_NAV: NavEntry[] = [
  { kind: "link", href: "/visitor", label: "Status", icon: Home },
  {
    kind: "group",
    id: "visit",
    label: "My visit",
    icon: MapPin,
    children: [
      { href: "/visitor/visit", label: "Visit & check-in" },
      { href: "/visitor/request", label: "Request visit" },
      { href: "/visitor/registration", label: "Registration" },
      { href: "/visitor/history", label: "History" },
    ],
  },
];

export const VISITOR_GROUPS: IconRailGroup[] = VISITOR_NAV.filter(
  (e): e is NavGroup => e.kind === "group"
);

export const NAV_STORAGE_KEY = "visitor-nav-expanded";
