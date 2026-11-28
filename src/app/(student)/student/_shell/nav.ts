import type { NavEntry, NavGroup, NavContext } from "@/components/shell/types";
import type { IconRailGroup } from "@/components/shared/IconRail";
import {
  Home, CheckSquare, UtensilsCrossed,
  UserCog, AlertCircle, BookOpen, ClipboardList,
} from "lucide-react";

// P1: the hostel-relevant nav items are gated on residentialStatus.
// A day scholar's sidebar never shows "Passes" / "New request" / "My tickets"
// for hostel leave — the conditions live HERE (in the nav array), not in a
// component's `if (role === ...)`. This is the single source of truth.
const isHosteller = (ctx: NavContext) => ctx.residentialStatus === "hosteller";

// 5 groups, 22 routes reachable — the home screen now only shows
// 5 cards; everything else is one tap away here.
export const STUDENT_NAV: NavEntry[] = [
  { kind: "link", href: "/student", label: "Home", icon: Home },
  { kind: "link", href: "/student/dashboard", label: "Campus OS Dashboard", icon: CheckSquare },
  {
    kind: "group", id: "permissions", label: "Passes & Requests", icon: CheckSquare,
    when: isHosteller, // hostel-leave surfaces: hostellers only
    children: [
      { href: "/student/passes", label: "Active Gate Passes", when: isHosteller },
      { href: "/student/permissions", label: "My Requests", when: isHosteller },
      { href: "/student/permissions/new", label: "New Request", when: isHosteller },
    ],
  },
  {
    kind: "group", id: "mess", label: "Mess & Dining", icon: UtensilsCrossed,
    children: [
      { href: "/student/mess", label: "Mess Overview" },
      { href: "/student/mess/token", label: "Meal Token & Menu" },
      { href: "/student/mess/reviews", label: "Meal Reviews" },
      { href: "/student/mess/special", label: "Special Meals" },
      { href: "/student/mess-bill", label: "Mess Bill" },
    ],
  },
  {
    kind: "group", id: "academic", label: "Academics", icon: ClipboardList,
    children: [
      { href: "/student/marks", label: "Marks & Grades" },
      { href: "/student/exams", label: "Exam Schedule" },
      { href: "/student/assignments", label: "Assignments" },
      { href: "/student/class-requests", label: "Class Requests" },
      { href: "/student/coordinator", label: "Class Rep (CR) Portal" },
      { href: "/student/fees", label: "Fees & Dues" },
      { href: "/student/scholarships", label: "Scholarships" },
      { href: "/student/library", label: "Library Books" },
    ],
  },
  {
    kind: "group", id: "campus", label: "Campus & Attendance", icon: BookOpen,
    children: [
      { href: "/student/attendance", label: "Attendance Summary" },
      { href: "/student/attendance-calendar", label: "Attendance Calendar" },
      { href: "/student/calendar", label: "My Calendar" },
      { href: "/student/my-events", label: "My Events" },
      { href: "/student/campus", label: "Campus Feed" },
      { href: "/student/history", label: "Gate Scan History" },
      { href: "/student/activity", label: "My Activity" },
      { href: "/student/achievements", label: "Achievements" },
      { href: "/student/knowledge", label: "Help & Knowledge" },
      { href: "/student/recap", label: "Monthly Recap" },
    ],
  },
  {
    kind: "group", id: "support", label: "Support", icon: AlertCircle,
    children: [
      { href: "/student/complaints", label: "Complaints" },
      { href: "/student/anti-ragging", label: "Anti-Ragging Report" },
    ],
  },
  {
    kind: "group", id: "account", label: "Account", icon: UserCog,
    children: [
      { href: "/student/id", label: "Digital ID Card" },
      { href: "/student/notifications", label: "Notifications" },
      { href: "/student/profile", label: "Profile & Settings" },
    ],
  },
];

export const STUDENT_GROUPS: IconRailGroup[] = STUDENT_NAV.filter(
  (e): e is NavGroup => e.kind === "group",
);

export const NAV_STORAGE_KEY = "student-nav-expanded";
