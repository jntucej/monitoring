import type { NavEntry } from "@/components/shell/types";
// src/app/(parent)/parent/_shell/nav.ts
import {
  LayoutDashboard, Users, Ticket, UserCog,
} from "lucide-react";

export const PARENT_NAV: NavEntry[] = [
  { kind: "link", href: "/parent", label: "Today", icon: LayoutDashboard },
  {
    kind: "group", id: "child", label: "My child", icon: Users,
    children: [
      { href: "/parent/child", label: "Status" },
      { href: "/parent/child-attendance", label: "Attendance" },
      { href: "/parent/child-requests", label: "Requests" },
      { href: "/parent/child-movement", label: "Movement" },
    ],
  },
  {
    kind: "group", id: "passes", label: "Passes", icon: Ticket,
    children: [
      { href: "/parent/passes", label: "Passes" },
      { href: "/parent/pass-leave-submission", label: "Submit" },
    ],
  },
  {
    kind: "group", id: "account", label: "Account", icon: UserCog,
    children: [
      { href: "/parent/settings", label: "Settings" },
      { href: "/parent/contact-info", label: "Contact info" },
    ],
  },
];
export const NAV_STORAGE_KEY = "parent-nav-expanded";
