"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu, X, ShieldCheck, LogOut,
  Activity, Server, Boxes, Database, Zap, Rocket, HardDrive,
  Bell, Lock, ScrollText, LayoutDashboard, Users, GraduationCap,
  Briefcase, Key, Shield, Building2, UserCheck, Clock,
  Cpu, Globe, Settings, FileText, LifeBuoy, UserCog, FileLock,
  Link as LinkIcon, ArrowLeftRight,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { GlassThemeToggle } from "@/components/shared/GlassThemeToggle";

type NavEntry = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};
type NavGroup = { label: string; items: NavEntry[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "System Overview",
    items: [
      { href: "/sysadmin", label: "System Overview", icon: LayoutDashboard, exact: true },
      { href: "/sysadmin/health", label: "Server Health", icon: Activity },
      { href: "/sysadmin/application-health", label: "Application Health", icon: Cpu },
      { href: "/sysadmin/docker-services", label: "Docker & Services", icon: Boxes },
      { href: "/sysadmin/database-health", label: "Database Health", icon: Database },
      { href: "/sysadmin/redis-worker", label: "Redis & Worker", icon: Zap },
      { href: "/sysadmin/deployments", label: "Deployment History", icon: Rocket },
      { href: "/sysadmin/backup", label: "Backup Status", icon: HardDrive },
      { href: "/sysadmin/infrastructure", label: "Host Telemetry", icon: Server },
    ],
  },
  {
    label: "Security & Policy",
    items: [
      { href: "/sysadmin/security", label: "Infrastructure Security", icon: Lock },
      { href: "/sysadmin/audit", label: "Technical Audit Logs", icon: ScrollText },
      { href: "/sysadmin/compliance", label: "Compliance & Retention", icon: FileLock },
      { href: "/sysadmin/exit-reasons", label: "Exit Reasons", icon: ArrowLeftRight },
      { href: "/sysadmin/reasons", label: "Custom Reasons", icon: FileText },
      { href: "/sysadmin/devices", label: "Device Verification", icon: Cpu },
      { href: "/sysadmin/alerts", label: "Monitoring & Alerts", icon: Bell },
      { href: "/sysadmin/alerts/rules", label: "Alert Rules", icon: Bell },
      { href: "/sysadmin/sessions", label: "Active Sessions", icon: Users },
      { href: "/sysadmin/access-keys", label: "Access Keys", icon: Key },
    ],
  },
  {
    label: "People & Records",
    items: [
      { href: "/sysadmin/students", label: "Manage Students", icon: GraduationCap },
      { href: "/sysadmin/parents", label: "Parents & Guardians", icon: Users },
      { href: "/sysadmin/staff", label: "Manage Staff", icon: Briefcase },
      { href: "/sysadmin/roles", label: "Roles & Permissions", icon: Shield },
      { href: "/sysadmin/departments", label: "Departments & HOD", icon: Building2 },
      { href: "/sysadmin/promotions", label: "Role Promotions", icon: UserCheck },
      { href: "/sysadmin/alumni", label: "Alumni & Deprovision", icon: Users },
      { href: "/sysadmin/hostel-tickets", label: "Hostel Tickets", icon: LifeBuoy },
    ],
  },
  {
    label: "Data & Integrations",
    items: [
      { href: "/sysadmin/data", label: "Data & Backups", icon: Database },
      { href: "/sysadmin/integrations", label: "Integration Hub", icon: LinkIcon },
      { href: "/sysadmin/jobs", label: "Scheduled Jobs", icon: Clock },
      { href: "/sysadmin/scheduling", label: "Smart Scheduling", icon: Clock },
      { href: "/sysadmin/gates", label: "Gates & Access", icon: Key },
      { href: "/sysadmin/sso", label: "SSO Configuration", icon: Globe },
    ],
  },
  {
    label: "Platform & Account",
    items: [
      { href: "/sysadmin/system", label: "System Configuration", icon: Settings },
      { href: "/sysadmin/navigation", label: "Navigation Editor", icon: Settings },
      { href: "/sysadmin/profile", label: "SysAdmin Profile", icon: UserCog },
    ],
  },
];

/* ── Shared nav list (desktop sidebar + mobile drawer) ───────────────── */
function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "";
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto p-3" aria-label="SysAdmin sections">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] ${
                    active
                      ? "bg-rose-600/15 text-rose-400 ring-1 ring-rose-500/30"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/* ── Account footer ──────────────────────────────────────────────────── */
function UserFooter({
  user,
  logout,
}: {
  user: { name?: string } | null;
  logout: () => void;
}) {
  return (
    <div className="space-y-2 border-t border-[var(--border)] p-3 pb-safe">
      <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-600/20 text-xs font-bold text-rose-300 ring-1 ring-rose-500/30">
            {user?.name ? user.name.charAt(0).toUpperCase() : "S"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">{user?.name || "System Admin"}</p>
            <p className="truncate font-mono text-[10px] text-[var(--text-muted)]">SYSADMIN</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-rose-500/10 hover:text-rose-400 focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
          aria-label="Sign out"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function SysadminStandaloneShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on Escape + lock body scroll while open
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-[var(--bg-base)] text-[var(--text-primary)] md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden shrink-0 border-r border-[var(--border)] bg-[var(--bg-surface)] md:flex md:w-64 md:flex-col">
        <div className="border-b border-[var(--border)] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600/20 text-rose-400 ring-1 ring-rose-500/40">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight">SysAdmin</p>
              <p className="font-mono text-[10px] uppercase text-[var(--text-muted)]">Control Room</p>
            </div>
          </div>
        </div>

        <NavList />
        <UserFooter user={user} logout={logout} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600/20 text-rose-400 ring-1 ring-rose-500/40">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold tracking-tight">SysAdmin</p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavList onNavigate={() => setDrawerOpen(false)} />
              <UserFooter user={user} logout={logout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main workspace */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 select-none items-center justify-between gap-2 border-b border-[var(--border)] bg-transparent px-3 pt-safe sm:px-6">
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[var(--glass-bg,var(--bg-surface))] backdrop-blur-xl"
            style={{
              WebkitBackdropFilter: "blur(24px) saturate(200%)",
              backdropFilter: "blur(24px) saturate(200%)",
            }}
          />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="truncate text-xs font-bold tracking-tight sm:text-sm">
              System Administration Console
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <GlassThemeToggle showCard={false} />
            <span className="hidden items-center gap-1 rounded-full border border-rose-500/30 bg-rose-600/10 px-2 py-1 text-[10px] font-bold uppercase text-rose-400 md:inline-flex">
              <ShieldCheck className="h-3 w-3" /> Elevated Security
            </span>
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-400 md:hidden"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-24 sm:p-6 md:pb-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
