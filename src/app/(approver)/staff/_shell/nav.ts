import type { NavEntry } from "@/components/shell/types";
// src/app/(approver)/staff/_shell/nav.ts
import {
  LayoutDashboard, ClipboardList, Inbox, History, Bell,
} from "lucide-react";

export const STAFF_NAV: NavEntry[] = [
  { kind: "link", href: "/staff", label: "Today", icon: LayoutDashboard },
  {
    kind: "group", id: "work", label: "My work", icon: ClipboardList,
    children: [
      { href: "/staff/my-day", label: "My day" },
      { href: "/staff/assigned-tasks", label: "Assigned tasks" },
      { href: "/staff/duties", label: "Duties" },
    ],
  },
  {
    kind: "group", id: "requests", label: "Requests", icon: Inbox,
    children: [
      { href: "/staff/requests", label: "Requests" },
      { href: "/staff/leaves", label: "Leaves" },
      { href: "/staff/request-status", label: "Request status" },
    ],
  },
  {
    kind: "group", id: "records", label: "Records", icon: History,
    children: [
      { href: "/staff/history", label: "History" },
      { href: "/staff/notifications", label: "Notifications" },
    ],
  },
];
export const NAV_STORAGE_KEY = "staff-nav-expanded";
