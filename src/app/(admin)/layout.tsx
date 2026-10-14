"use client";

import React, { useMemo, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  LayoutDashboard, Bell, Megaphone, CalendarCheck, GraduationCap,
  QrCode, MapPin, FileSpreadsheet, UtensilsCrossed, Users, Briefcase,
  UserCog, Settings, Shield, SlidersHorizontal, Building2, GitBranch,
  BellRing, ScrollText, Activity, HelpCircle, Leaf, HardHat, Search,
  ChevronDown,
} from "lucide-react";

/* ── Canonical grouped nav (reconciles with real routes) ─────────────── */
type NavEntry = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};
type NavGroup = { label: string; items: NavEntry[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Command Center",
    items: [
      { href: "/admin", label: "Campus Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/overview", label: "Overview", icon: HelpCircle },
      { href: "/admin/alerts", label: "Alerts & Radar", icon: Bell },
    ],
  },
  {
    label: "Rosters & Records",
    items: [
      { href: "/admin/students", label: "Students", icon: GraduationCap },
      { href: "/admin/faculty", label: "Faculty", icon: Users },
      { href: "/admin/staff", label: "Staff", icon: Briefcase },
      { href: "/admin/workers", label: "Workers", icon: HardHat },
      { href: "/admin/attendance", label: "Attendance", icon: CalendarCheck },
    ],
  },
  {
    label: "Gates & Access",
    items: [
      { href: "/admin/gates", label: "Gates", icon: QrCode },
      { href: "/admin/occupancy", label: "Occupancy & Twin", icon: MapPin },
      { href: "/admin/gate-device-configuration", label: "Gate & Devices", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Analytics & Reports",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: Activity },
      { href: "/admin/reports", label: "Reports", icon: FileSpreadsheet },
      { href: "/admin/sustainability", label: "Sustainability", icon: Leaf },
    ],
  },
  {
    label: "Institution & Facilities",
    items: [
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/mess", label: "Mess", icon: UtensilsCrossed },
      { href: "/admin/support", label: "Support Desk", icon: HelpCircle },
    ],
  },
  {
    label: "Governance & Settings",
    items: [
      { href: "/admin/users", label: "Users & Roles", icon: UserCog },
      { href: "/admin/roles", label: "Roles & Hierarchy", icon: Shield },
      { href: "/admin/permission-policies", label: "Permission Policies", icon: Shield },
      { href: "/admin/institutional-configuration", label: "Institutional Config", icon: Building2 },
      { href: "/admin/workflow-configuration", label: "Workflows", icon: GitBranch },
      { href: "/admin/notification-settings", label: "Notification Settings", icon: BellRing },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
    ],
  },
];

function isActive(href: string, exact: boolean, pathname: string): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const role = useAuthStore((s) => s.user?.role) ?? "admin";
  const [query, setQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>(NAV_GROUPS[0].label);
  const isSysadmin = role === "sysadmin";

  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    if (!q) return NAV_GROUPS;
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.href.toLowerCase().includes(q) ||
          g.label.toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [q]);

  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <div className="min-h-[100dvh] flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-40 flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 md:px-6 pt-safe">
        {/* Role-context chip + search */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {isSysadmin ? "SysAdmin" : "Campus Admin"}
            </span>
            <span className="truncate text-sm font-bold tracking-tight">
              {isSysadmin ? "Elevated Console · Campus Workspace" : "Campus Administration Console"}
            </span>
          </div>
          <div className="relative w-40 shrink-0 sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sections…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-1.5 pl-8 pr-3 text-xs text-[var(--text-primary)] outline-none focus:border-emerald-500/40"
              aria-label="Search admin sections"
            />
          </div>
        </div>

        {/* Desktop: grouped horizontal chips. Mobile: collapsible groups. */}
        <nav aria-label="Admin sections">
          {/* Desktop nav */}
          <div className="hidden md:flex md:items-start md:gap-6">
            {groups.map((group) => (
              <div key={group.label} className="shrink-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {group.label}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.href, !!item.exact, pathname);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            active
                              ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                              : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Mobile nav */}
          <div className="md:hidden">
            <ul className="space-y-1">
              {groups.map((group) => {
                const open = q ? true : openGroup === group.label;
                return (
                  <li key={group.label}>
                    <button
                      type="button"
                      onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                      aria-expanded={open}
                    >
                      <span>{group.label}</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <ul className="ml-1 mt-1 space-y-0.5 border-l border-[var(--border)] pl-2">
                        {group.items.map((item) => {
                          const active = isActive(item.href, !!item.exact, pathname);
                          const Icon = item.icon;
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                  active
                                    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                                    : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                                }`}
                              >
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span>{item.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
      </div>
    </AuthGuard>
  );
}
