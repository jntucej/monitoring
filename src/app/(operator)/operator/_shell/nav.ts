import type { NavEntry } from "@/components/shell/types";
// src/app/(operator)/operator/_shell/nav.ts
import {
  ScanLine, History, ShieldAlert, KeyRound,
  BadgeCheck, MoreHorizontal,
} from "lucide-react";

export const OPERATOR_NAV: NavEntry[] = [
  { kind: "link", href: "/operator", label: "Desk", icon: ScanLine },
  { kind: "link", href: "/operator/transactions", label: "Transactions", icon: History },
  { kind: "link", href: "/operator/exceptions", label: "Exceptions", icon: ShieldAlert },
  {
    kind: "group", id: "more", label: "More", icon: MoreHorizontal,
    children: [
      { href: "/operator/manual-entry", label: "Manual entry" },
      { href: "/operator/pass-verification", label: "Pass verification" },
      { href: "/operator/claim", label: "Claim gate" },
      { href: "/operator/kiosk-pin", label: "Kiosk PIN" },
    ],
  },
];
export const NAV_STORAGE_KEY = "operator-nav-expanded";
