import type { NavEntry, NavGroup } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
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

export const PARENT_GROUPS: IconRailGroup[] = PARENT_NAV.filter(
  (e): e is NavGroup => e.kind === "group"
);

export const NAV_STORAGE_KEY = "parent-nav-expanded";
