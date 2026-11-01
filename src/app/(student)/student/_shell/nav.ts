import type { NavEntry, NavGroup } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
import {
  Home, CheckSquare, UtensilsCrossed,
  UserCog, AlertCircle, BookOpen,
} from "lucide-react";

// 5 groups, 22 routes reachable — the home screen now only shows
// 5 cards; everything else is one tap away here.
export const STUDENT_NAV: NavEntry[] = [
  { kind: "link", href: "/student", label: "Home", icon: Home },
  {
    kind: "group", id: "permissions", label: "Permissions", icon: CheckSquare,
    children: [
      { href: "/student/permissions", label: "My tickets" },
      { href: "/student/permissions/new", label: "New request" },
      { href: "/student/passes", label: "Passes" },
      { href: "/student/attendance", label: "Attendance" },
    ],
  },
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
    kind: "group", id: "campus", label: "Campus", icon: BookOpen,
    children: [
      { href: "/student/campus", label: "Campus home" },
      { href: "/student/activity", label: "My activity" },
      { href: "/student/achievements", label: "Achievements" },
      { href: "/student/knowledge", label: "Knowledge" },
      { href: "/student/recap", label: "My recap" },
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
      { href: "/student/id", label: "Digital ID" },
      { href: "/student/notifications", label: "Notifications" },
      { href: "/student/profile", label: "Profile" },
    ],
  },
];

export const STUDENT_GROUPS: IconRailGroup[] = STUDENT_NAV.filter(
  (e): e is NavGroup => e.kind === "group",
);

export const NAV_STORAGE_KEY = "student-nav-expanded";
