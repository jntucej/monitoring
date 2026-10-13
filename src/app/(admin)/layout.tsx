"use client";

import React from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_ALLOWED_ROLES: Role[] = ["admin", "sysadmin"];

const TABS = [
  { href: "/admin", label: "Campus Dashboard", exact: true },
  { href: "/admin/alerts", label: "Alerts" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/attendance", label: "Attendance" },
  { href: "/admin/faculty", label: "Faculty" },
  { href: "/admin/gates", label: "Gates" },
  { href: "/admin/occupancy", label: "Occupancy" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/mess", label: "Mess" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/users", label: "Users & Roles" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/permission-policies", label: "Permission Policies" },
  { href: "/admin/institutional-configuration", label: "Institutional Config" },
  { href: "/admin/gate-device-configuration", label: "Gate & Devices" },
  { href: "/admin/workflow-configuration", label: "Workflows" },
  { href: "/admin/notification-settings", label: "Notification Settings" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
] as const;

function tabActive(tab: (typeof TABS)[number], pathname: string): boolean {
  if ("exact" in tab && tab.exact) return pathname === tab.href;
  return pathname === tab.href || pathname.startsWith(tab.href + "/");
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AuthGuard allowedRoles={ADMIN_ALLOWED_ROLES}>
      <div className="min-h-screen bg-[#0f172a]">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
          <nav className="mb-6 border-b border-slate-700" aria-label="Admin sections">
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
