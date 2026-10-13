"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ShieldCheck, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { GlassThemeToggle } from "@/components/shared/GlassThemeToggle";

/**
 * Spec section tabs (main bar): 10 spec sections mapped onto the existing
 * sysadmin tree. Everything else stays reachable under "More" overflow
 * groups so no existing route is orphaned.
 */
const SPEC_TABS = [
  { href: "/sysadmin/health", label: "Server Health", icon: "▨" },
  { href: "/sysadmin/application-health", label: "Application Health", icon: "⚙" },
  { href: "/sysadmin/docker-services", label: "Docker & Services", icon: "⬢" },
  { href: "/sysadmin/database-health", label: "Database Health", icon: "🗄" },
  { href: "/sysadmin/redis-worker", label: "Redis & Worker", icon: "⚡" },
  { href: "/sysadmin/deployments", label: "Deployment History", icon: "⇣" },
  { href: "/sysadmin/backup", label: "Backup Status", icon: "⎙" },
  { href: "/sysadmin/alerts", label: "Monitoring & Alerts", icon: "🔔" },
  { href: "/sysadmin/security", label: "Infrastructure Security", icon: "🛡" },
  { href: "/sysadmin/audit", label: "Technical Audit Logs", icon: "📜" },
] as const;

const MORE_GROUPS = [
  {
    label: "People & Records",
    items: [
      { href: "/sysadmin/students", label: "Manage Students" },
      { href: "/sysadmin/parents", label: "Parents & Guardians" },
      { href: "/sysadmin/staff", label: "Manage Staff" },
      { href: "/sysadmin/roles", label: "Roles & Permissions" },
      { href: "/sysadmin/departments", label: "Departments & HOD" },
      { href: "/sysadmin/promotions", label: "Role Promotions" },
      { href: "/sysadmin/alumni", label: "Alumni & Deprovision" },
      { href: "/sysadmin/sessions", label: "Active Sessions" },
      { href: "/sysadmin/access-keys", label: "Access Keys" },
    ],
  },
  {
    label: "Data & Integrations",
    items: [
      { href: "/sysadmin/data", label: "Data & Backups" },
      { href: "/sysadmin/integrations", label: "Integration Hub" },
      { href: "/sysadmin/jobs", label: "Scheduled Jobs" },
      { href: "/sysadmin/scheduling", label: "Smart Scheduling" },
      { href: "/sysadmin/gates", label: "Gates & Access" },
      { href: "/sysadmin/sso", label: "SSO Configuration" },
      { href: "/sysadmin/infrastructure", label: "Host Telemetry" },
    ],
  },
  {
    label: "Policy & Platform",
    items: [
      { href: "/sysadmin/compliance", label: "Compliance & Retention" },
      { href: "/sysadmin/exit-reasons", label: "Exit Reasons" },
      { href: "/sysadmin/reasons", label: "Custom Reasons" },
      { href: "/sysadmin/devices", label: "Device Verification" },
      { href: "/sysadmin/alerts/rules", label: "Alert Rules" },
      { href: "/sysadmin/navigation", label: "Navigation Editor" },
      { href: "/sysadmin/system", label: "System" },
    ],
  },
] as const;

// Shared nav list — renders once for the desktop sidebar and the mobile drawer
function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/sysadmin" ? pathname === href : pathname?.startsWith(href);

  return (
    <nav className="flex-1 overflow-y-auto p-3 space-y-5">
      {/* Spec sections — the main bar */}
      <div>
        <p className="px-3 pb-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
          System Sections
        </p>
        <div className="space-y-0.5">
          <Link
            href="/sysadmin"
            onClick={onNavigate}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] ${
              isActive("/sysadmin")
                ? "bg-rose-600/15 text-rose-400 ring-1 ring-rose-500/30"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
            }`}
          >
            <span className="w-4 text-center text-xs">⌂</span>
            <span className="truncate">System Overview</span>
          </Link>
          {SPEC_TABS.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] ${
                  active
                    ? "bg-rose-600/15 text-rose-400 ring-1 ring-rose-500/30"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <span className="w-4 text-center text-xs">{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* More overflow — grouped extras, all existing routes preserved */}
      {MORE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] ${
                    active
                      ? "bg-rose-600/15 text-rose-400 ring-1 ring-rose-500/30"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                  }`}
                >
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

// Shared account footer — used by both shells
function UserFooter({
  user,
  logout,
}: {
  user: { name?: string } | null;
  logout: () => void;
}) {
  return (
    <div className="p-3 border-t border-[var(--border)] space-y-2">
      <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-rose-600/20 text-rose-300 flex items-center justify-center text-xs font-bold ring-1 ring-rose-500/30 shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : "S"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">{user?.name || "System Admin"}</p>
            <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">SYSADMIN</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
          aria-label="Sign out"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
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

  return (
    <div className="min-h-[100dvh] w-full flex flex-col md:flex-row bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Standalone SysAdmin Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center ring-1 ring-rose-500/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight">SysAdmin</p>
              <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase">Control Room</p>
            </div>
          </div>
        </div>

        <NavList />
        <UserFooter user={user} logout={logout} />
      </aside>

      {/* Mobile Navigation Drawer — follows Sidebar drawer pattern */}
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
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border)] md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center ring-1 ring-rose-500/40">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold tracking-tight">SysAdmin</p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <NavList onNavigate={() => setDrawerOpen(false)} />
              <UserFooter user={user} logout={logout} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Standalone Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="relative h-14 sticky top-0 z-40 flex items-center justify-between gap-2 px-3 sm:px-6 bg-transparent border-b border-[var(--border)] select-none">
          {/* Inner backdrop glass layer for iOS Safari chrome tint optimization */}
          <div
            className="absolute inset-0 -z-10 pointer-events-none backdrop-blur-xl bg-[var(--glass-bg,var(--bg-surface))]"
            style={{
              WebkitBackdropFilter: "blur(24px) saturate(200%)",
              backdropFilter: "blur(24px) saturate(200%)",
            }}
          />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <p className="text-xs sm:text-sm font-bold tracking-tight truncate">🔐 System Administration Console</p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <GlassThemeToggle showCard={false} />
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-600/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold uppercase shrink-0">
              <ShieldCheck className="w-3 h-3" /> Elevated Security
            </span>
            <button
              onClick={logout}
              className="md:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
