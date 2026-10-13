"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import Link from "next/link";
import { Suspense } from "react";
import type { Role } from "@/lib/types";

const ALLOWED_ROLES: Role[] = ["oie", "exam_branch", "vice_principal", "admin", "sysadmin"];

const TABS = [
  { href: "/exam-branch/calendar", label: "Exam Calendar" },
  { href: "/exam-branch/records", label: "Records" },
  { href: "/exam-branch/pass-queue", label: "Pass Queue" },
  { href: "/exam-branch/verification", label: "Verification" },
  { href: "/exam-branch/discrepancies", label: "Discrepancies" },
  { href: "/exam-branch/reports", label: "Reports" },
  { href: "/exam-branch/oie-approval-requests", label: "OIE Approvals" },
  { href: "/exam-branch/docs", label: "Docs" },
] as const;

function ExamBranchTabs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-w-0">
      <nav className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-base)]/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
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
        </div>
      </nav>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">{children}</div>

    </div>
  );
}

export default function ExamBranchTabbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <Suspense fallback={<PageLoading />}>
        <ExamBranchTabs>{children}</ExamBranchTabs>
      </Suspense>
    </AuthGuard>
  );
}
