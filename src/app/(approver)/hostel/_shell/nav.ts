import type { NavEntry, NavGroup } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
import { LayoutDashboard, Utensils, Radio, FlaskConical } from "lucide-react";

/**
 * The Hostel & Security OS surface: EXACTLY 3 routes. The active sub-role
 * (Chief Warden / Deputy Warden / Hostel Manager) is filtered live from the
 * catalog; action permissions adjust per sub-role without extra pages.
 */
export const HOSTEL_OS_NAV: NavEntry[] = [
  { kind: "link", href: "/hostel", label: "Gate & Passes", icon: LayoutDashboard },
  {
    kind: "group",
    id: "hostel-os",
    label: "Warden OS",
    icon: FlaskConical,
    children: [
      { href: "/hostel", label: "Gate Passes & Curfew" },
      { href: "/hostel/mess-and-config", label: "Mess & facilities.config" },
      { href: "/hostel/bridge-and-telemetry", label: "Bridge & Telemetry" },
    ],
  },
];

export const HOSTEL_OS_GROUPS: IconRailGroup[] = HOSTEL_OS_NAV.filter(
  (e): e is NavGroup => e.kind === "group",
);

export const NAV_STORAGE_KEY = "hostel-os-nav-expanded";
