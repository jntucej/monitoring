"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import type { Role } from "@/lib/types";

const ALLOWED_ROLES: Role[] = ["guardian", "parent", "admin", "sysadmin"];

const TABS = [
  { href: "/guardian", label: "Linked Student Overview", exact: true },
  { href: "/guardian/child-attendance", label: "Attendance Summary" },
  { href: "/guardian/movement-info", label: "Authorised Movement Information" },
  { href: "/guardian/pass-leave-submission", label: "Pass & Leave Request" },
  { href: "/guardian/request-status", label: "Request Status" },
  { href: "/guardian/notifications", label: "Notifications" },
  { href: "/guardian/contact-info", label: "Contact Information" },
] as const;

function tabActive(tab: (typeof TABS)[number], pathname: string): boolean {
  if ("exact" in tab && tab.exact) return pathname === tab.href;
  return pathname === tab.href || pathname.startsWith(tab.href + "/");
}

function GuardianTabbedNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-w-0">
      <nav
        className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-base)]/95 backdrop-blur-md"
        aria-label="Guardian sections"
      >
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <ol className="flex flex-wrap items-center gap-1 text-sm">
            {TABS.map((tab) => {
              const isActive = tabActive(tab, pathname);
              return (
                <li key={tab.href}>
                  {isActive ? (
                    <span className="inline-flex items-center px-3 py-2 text-emerald-400 font-semibold border-b-2 border-emerald-400">
                      {tab.label}
                    </span>
                  ) : (
                    <Link
                      href={tab.href}
                      className="inline-flex items-center px-3 py-2 text-slate-400 hover:text-slate-200 transition-colors motion-reduce:transition-none"
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

export default function GuardianTabbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={ALLOWED_ROLES}>
      <Suspense fallback={<PageLoading />}>
        <GuardianTabbedNav>{children}</GuardianTabbedNav>
      </Suspense>
    </AuthGuard>
  );
}
