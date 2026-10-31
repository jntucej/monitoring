import type { NavEntry, NavGroup } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
import {
  ScanLine, History, MoreHorizontal,
} from "lucide-react";

export const OPERATOR_NAV: NavEntry[] = [
  { kind: "link", href: "/operator", label: "Desk", icon: ScanLine },
  {
    kind: "group",
    id: "activity",
    label: "Activity",
    icon: History,
    children: [
      { href: "/operator/stats", label: "Stats" },
      { href: "/operator/transactions", label: "Transactions" },
      { href: "/operator/exceptions", label: "Exceptions" },
    ],
  },
  {
    kind: "group",
    id: "management",
    label: "Operations",
    icon: MoreHorizontal,
    children: [
      { href: "/operator/manual-entry", label: "Manual entry" },
      { href: "/operator/pass-verification", label: "Pass verification" },
      { href: "/operator/claim", label: "Claim gate" },
      { href: "/operator/kiosk-pin", label: "Kiosk PIN" },
    ],
  },
];

export const OPERATOR_GROUPS: IconRailGroup[] = OPERATOR_NAV.filter(
  (e): e is NavGroup => e.kind === "group"
);

export const NAV_STORAGE_KEY = "operator-nav-expanded";
