"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Principal tab bar — covers every section in the institutional spec.
 * Existing directory-based sections are kept as aliases where a spec
 * section already had a home (e.g. /principal/departments for Department
 * Analytics, /principal/incidents for Incident Centre); the new 12
 * spec sections each get their own tab entry.
 */
const TABS = [
  { href: "/principal", label: "Overview" },
  { href: "/principal/all-pass-requests", label: "All Pass Requests" },
  { href: "/principal/approval-centre", label: "Approval Centre" },
  { href: "/principal/departments", label: "Departments" },
  { href: "/principal/department-analytics", label: "Dept Analytics" },
  { href: "/principal/hostel-oversight", label: "Hostel" },
  { href: "/principal/examination-oversight", label: "Exams" },
  { href: "/principal/incidents", label: "Incidents" },
  { href: "/principal/delegation-manager", label: "Delegation" },
  { href: "/principal/permission-management", label: "Permissions" },
  { href: "/principal/reports", label: "Reports" },
  { href: "/principal/audit", label: "Audit" },
  { href: "/principal/emergency-decisions", label: "Emergency" },
  { href: "/principal/attendance", label: "Attendance" },
  { href: "/principal/gate-activity", label: "Gates" },
  { href: "/principal/approvals", label: "Approvals" },
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
                  <span
                    aria-current="page"
                    className="inline-flex items-center rounded-lg bg-[var(--action-primary)]/15 px-3 py-1.5 text-[var(--action-primary)] font-semibold text-xs sm:text-sm"
                  >
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
