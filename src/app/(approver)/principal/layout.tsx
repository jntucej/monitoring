"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/principal", label: "Overview" },
  { href: "/principal/attendance", label: "Attendance" },
  { href: "/principal/gate-activity", label: "Gates" },
  { href: "/principal/departments", label: "Departments" },
  { href: "/principal/incidents", label: "Incidents" },
  { href: "/principal/reports", label: "Reports" },
  { href: "/principal/approvals", label: "Approvals" },
  { href: "/principal/audit", label: "Audit" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/principal") return pathname === "/principal";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-w-0">
      {/* Tab navigation — sticky, horizontal scroll on mobile */}
      <nav
        className="sticky top-14 sm:top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-[var(--bg-base)]/80 backdrop-blur-md border-b border-[var(--border)]"
        aria-label="Principal sections"
      >
        <ol className="flex overflow-x-auto no-scrollbar gap-1 text-sm py-2 whitespace-nowrap">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <li key={tab.href} className="shrink-0">
                {active ? (
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
