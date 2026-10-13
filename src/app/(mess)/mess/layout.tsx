"use client";

import React from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MESS_ALLOWED_ROLES: Role[] = ["mess_incharge", "principal", "admin", "sysadmin"];

const TABS = [
  { href: "/mess", label: "Mess Overview", exact: true },
  { href: "/mess/daily-meal-counts", label: "Daily Meal Counts" },
  { href: "/mess/meal-attendance", label: "Meal Attendance" },
  { href: "/mess/menu-management", label: "Menu Management" },
  { href: "/mess/inventory-stock", label: "Inventory & Stock" },
  { href: "/mess/consumption-reports", label: "Consumption Reports" },
  { href: "/mess/mess-issues", label: "Mess Issues" },
  { href: "/mess/operational-requests", label: "Operational Requests" },
  { href: "/mess/scan", label: "Token Scanner" },
] as const;

function tabActive(tab: (typeof TABS)[number], pathname: string): boolean {
  if ("exact" in tab && tab.exact) return pathname === tab.href;
  return pathname === tab.href || pathname.startsWith(tab.href + "/");
}

export default function MessLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AuthGuard allowedRoles={MESS_ALLOWED_ROLES}>
      <div className="min-h-screen bg-[#0f172a]">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
          {/* Tab navigation */}
          <nav className="mb-6 border-b border-slate-700" aria-label="Mess sections">
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
