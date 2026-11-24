import {
  Home,
  ShieldCheck,
  CalendarCheck,
  MapPin,
  Inbox,
  FilePlus2,
  Clock,
  Calendar,
  Phone,
  Bell,
} from "lucide-react";
import type { NavEntry } from "@/components/shell/types";

export const NAV_STORAGE_KEY = "guardian.nav.v1";

export const GUARDIAN_NAV: NavEntry[] = [
  { kind: "link", href: "/guardian", label: "Home", icon: Home },
  {
    kind: "group",
    id: "ward",
    label: "Ward Monitoring",
    icon: ShieldCheck,
    children: [
      { href: "/guardian/child-status", label: "Ward Status" },
      { href: "/guardian/child-attendance", label: "Attendance" },
      { href: "/guardian/movement-info", label: "Gate Movement" },
    ],
  },
  {
    kind: "group",
    id: "requests",
    label: "Passes & Consent",
    icon: Inbox,
    children: [
      { href: "/guardian/child-requests", label: "Pending Consent" },
      { href: "/guardian/pass-leave-submission", label: "Submit Pass / Leave" },
      { href: "/guardian/request-status", label: "Request Status" },
    ],
  },
  { kind: "link", href: "/guardian/visit-schedule", label: "Visit Schedule", icon: Calendar },
  { kind: "link", href: "/guardian/contact-info", label: "Contact Info", icon: Phone },
  { kind: "link", href: "/guardian/notifications", label: "Notifications", icon: Bell },
];
