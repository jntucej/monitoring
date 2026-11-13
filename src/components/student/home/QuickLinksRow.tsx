"use client";

import Link from "next/link";
import {
  Calendar,
  ClipboardList,
  Home,
  Utensils,
  BookOpen,
} from "lucide-react";

const LINKS = [
  { href: "/student/permissions", label: "Requests", Icon: ClipboardList },
  { href: "/student/passes", label: "Passes", Icon: Home },
  { href: "/student/attendance", label: "Attendance", Icon: Calendar },
  { href: "/student/mess", label: "Mess", Icon: Utensils },
  { href: "/student/campus", label: "Campus", Icon: BookOpen },
] as const;

export function QuickLinksRow() {
  return (
    <div className="grid grid-cols-5 gap-2">
      {LINKS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex flex-col items-center gap-1 rounded-xl border border-border bg-bg-surface py-3 text-xs text-text-secondary"
        >
          <Icon className="h-5 w-5" aria-hidden />
          <span>{label}</span>
        </Link>
      ))}
    </div>
  );
}
