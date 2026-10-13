"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Tabbed navigation for the operator role's split sub-pages.
 *
 * The (operator) route group already carries the AuthGuard (operator /
 * worker / admin / sysadmin), so this layout only renders the tab strip
 * and lets the overview + sub-pages nest underneath.
 */
const TABS = [
  { href: "/operator", label: "Overview", exact: true },
  { href: "/operator/scan", label: "Scan" },
  { href: "/operator/transactions", label: "Transactions" },
  { href: "/operator/pass-verification", label: "Pass Verification" },
  { href: "/operator/manual-entry", label: "Manual Entry" },
  { href: "/operator/exceptions", label: "Exceptions" },
] as const;

export default function OperatorSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const tabActive = (tab: (typeof TABS)[number], path: string): boolean => {
    if ("exact" in tab && tab.exact) return path === tab.href;
    return path === tab.href || path.startsWith(tab.href + "/");
  };

  return (
    <div className="min-w-0">
      <nav
        className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-[var(--bg-base)]/80 backdrop-blur-md border-b border-[var(--border)]"
        aria-label="Operator sections"
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
