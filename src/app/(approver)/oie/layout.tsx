"use client";

import React from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ALLOWED_ROLES: Role[] = ["oie", "admin", "sysadmin"];

const TABS = [
  { href: "/oie", label: "Overview" },
  { href: "/oie/examination-pass-requests", label: "Pass Requests" },
  { href: "/oie/examination-day-access", label: "Exam-Day Access" },
  { href: "/oie/candidate-attendance", label: "Candidate Attendance" },
  { href: "/oie/access-exceptions", label: "Access Exceptions" },
  { href: "/oie/exam-branch-coordination", label: "Exam Branch" },
  { href: "/oie/pending-approvals", label: "Approvals" },
  { href: "/oie/examination-reports", label: "Reports" },
  { href: "/oie/decision-history", label: "Decision History" },
] as const;

export default function OieLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <div className="min-h-screen bg-[#0f172a]">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
          {/* Tab navigation */}
          <nav className="mb-6 border-b border-slate-700" aria-label="OIE sections">
            <ol className="flex flex-wrap items-center gap-1 text-sm">
              {TABS.map((tab) => {
                const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
                return (
                  <li key={tab.href}>
                    {isActive ? (
                      <span className="inline-flex items-center px-3 py-2 text-emerald-400 font-semibold border-b-2 border-emerald-400">
                        {tab.label}
                      </span>
                    ) : (
                      <Link
                        href={tab.href}
                        className="inline-flex items-center px-3 py-2 text-slate-400 hover:text-slate-200 transition-colors"
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
      </div>
    </AuthGuard>
  );
}
