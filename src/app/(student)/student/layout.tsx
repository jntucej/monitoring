"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/student", label: "Overview", exact: true },
  { href: "/student/attendance-calendar", label: "Attendance" },
  { href: "/student/pass-application", label: "Passes" },
  { href: "/student/leave-requests", label: "Leave" },
  { href: "/student/request-tracking", label: "Requests" },
  { href: "/student/history", label: "Entry / Exit" },
  { href: "/student/notifications", label: "Notifications" },
  { href: "/student/profile-security", label: "Profile" },
] as const;

function tabActive(tab: (typeof TABS)[number], pathname: string): boolean {
  if ("exact" in tab && tab.exact) return pathname === tab.href;
  return pathname === tab.href || pathname.startsWith(tab.href + "/");
}

export default function StudentSubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-w-0">
      <nav
        className="sticky top-14 sm:top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-[var(--bg-base)]/80 backdrop-blur-md border-b border-[var(--border)]"
        aria-label="Student sections"
      >
        <ol className="flex overflow-x-auto no-scrollbar gap-1 text-sm py-2 whitespace-nowrap">
          {TABS.map((tab) => {
            const isActive = tabActive(tab, pathname);
            return (
              <li key={tab.href} className="shrink-0">
                {isActive ? (
                  <span className="inline-flex items-center rounded-lg bg-[var(--action-primary)]/15 px-3 py-1.5 text-[var(--action-primary)] font-semibold text-xs sm:text-sm">
                    {tab.label}
                  </span>
                ) : (
                  <Link
                    href={tab.href}
                    className="inline-flex items-center rounded-lg px-3 py-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors text-xs sm:text-sm"
                  >
                    {tab.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      {children}
    </div>
  );
}
