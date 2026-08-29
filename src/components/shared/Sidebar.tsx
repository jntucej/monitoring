"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import { Menu, X, ChevronLeft, ChevronRight, LogOut, ShieldCheck } from "lucide-react";

import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useNavigation, NavGroup, NavItem } from "@/hooks/useNavigation";
import type { Role, User } from "@/lib/types";

const iconMap: Record<string, any> = Icons;

// Helper to determine active link
function isItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === pathname) return true;
  if (href.includes("?")) {
    const [basePath] = href.split("?");
    if (pathname === basePath) return true;
  }
  if (href !== "/" && href.length > 2 && pathname.startsWith(href) && !href.includes("?")) {
    return true;
  }
  return false;
}
interface DesktopSidebarProps {
  processedNav: NavGroup[];
  pathname: string | null;
  currentRole: Role;
  user: User | null;
  logout: () => void;
  isSidebarCollapsed: boolean;
  toggleSidebarCollapse: () => void;
}

const getPriorityItems = (role: Role, items: NavItem[]): NavItem[] => {
  const priorityMap: Record<string, string[]> = {
    admin: ['/admin', '/admin/students', '/admin/alerts', '/admin/reports'],
    sysadmin: ['/sysadmin', '/sysadmin/analytics', '/sysadmin/security', '/sysadmin/audit'],
    operator: ['/gate', '/gate/history', '/admin/alerts', '/gate/manual'],
    supervisor: ['/supervisor', '/supervisor/passes', '/admin/alerts', '/supervisor/reports'],
    warden: ['/warden', '/warden/passes', '/admin/alerts', '/warden/occupancy'],
    student: ['/student', '/student/history', '/student/passes', '/student/profile'],
    parent: ['/parent', '/parent/requests', '/parent/students', '/parent/profile'],
    guardian: ['/parent', '/parent/requests', '/parent/students', '/parent/profile'],
    faculty: ['/faculty', '/faculty/classes', '/admin/alerts', '/faculty/profile'],
    staff: ['/staff', '/staff/attendance', '/admin/alerts', '/staff/profile'],
    worker: ['/worker', '/worker/schedule', '/admin/alerts', '/worker/profile'],
    visitor: ['/visitor', '/visitor/passes', '/visitor/status', '/visitor/profile'],
  };
  const priority = priorityMap[role] || [];
  const prioritized = items.filter(item => priority.some(p => item.href.startsWith(p)));
  const remaining = items.filter(item => !priority.some(p => item.href.startsWith(p)));
  return [...prioritized, ...remaining].slice(0, 4);
};

function DesktopSidebar({
  processedNav,
  pathname,
  currentRole,
  user,
  logout,
  isSidebarCollapsed,
  toggleSidebarCollapse,
}: DesktopSidebarProps) {
  return (
    <aside
      aria-label="Primary navigation"
      className={`hidden md:flex fixed inset-y-0 left-0 z-30 flex-col bg-[var(--bg-surface)]/95 backdrop-blur-xl border-r border-[var(--border)] select-none transition-all duration-300 ${
        isSidebarCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="px-3 py-3 border-b border-[var(--border)] flex items-center justify-between min-h-[64px]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-[var(--action-primary)]/20 text-[var(--action-primary)] flex items-center justify-center shrink-0 font-bold border border-[var(--action-primary)]/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0 transition-opacity duration-200">
              <p className="text-sm font-bold tracking-tight text-[var(--text-primary)] truncate">
                Gate Monitor
              </p>
              <p className="text-[10px] font-mono uppercase text-[var(--text-muted)] truncate">
                {currentRole}
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={toggleSidebarCollapse}
          className={`p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] ${
            isSidebarCollapsed ? "mx-auto" : ""
          }`}
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Dynamic Groups & Items */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4 custom-scrollbar">
        {processedNav.map((group) => (
          <div key={group.groupLabel}>
            {!isSidebarCollapsed ? (
              <p className="px-3 pb-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {group.groupLabel}
              </p>
            ) : (
              <div className="h-px bg-[var(--border)] my-2 mx-1" />
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isItemActive(pathname, item.href);
                const Icon = (item.icon && iconMap[item.icon]) || Icons.HelpCircle;

                return isSidebarCollapsed ? (
                  <div key={item.href} className="relative group flex items-center justify-center">
                    <Link
                      href={item.href}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-xs font-medium transition-all ${
                        active
                          ? "bg-[var(--action-primary)]/15 text-[var(--action-primary)] font-semibold border border-[var(--action-primary)]/30"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                      }`}
                      aria-label={item.label}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                    </Link>
                    <span className="absolute left-full ml-2 px-2.5 py-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-50 text-[var(--text-primary)]">
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      active
                        ? "bg-[var(--action-primary)]/15 text-[var(--action-primary)] font-semibold border border-[var(--action-primary)]/30"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <div className="flex-1 flex items-center justify-between truncate">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-full bg-[var(--action-primary)]/20 text-[var(--action-primary)] uppercase">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[var(--action-primary)]/20 text-[var(--action-primary)] flex items-center justify-center text-xs font-bold shrink-0 border border-[var(--action-primary)]/30">
            {user?.name ? user.name.charAt(0).toUpperCase() : currentRole.charAt(0).toUpperCase()}
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {user?.name || "User"}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] capitalize truncate">
                {currentRole}
              </p>
            </div>
          )}
        </div>
        {!isSidebarCollapsed && (
          <button
            onClick={logout}
            className="p-1.5 text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
interface MobileDrawerProps {
  isMobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  processedNav: NavGroup[];
  pathname: string | null;
  currentRole: Role;
  user: User | null;
  logout: () => void;
}

function MobileDrawer({
  isMobileSidebarOpen,
  toggleMobileSidebar,
  setMobileSidebarOpen,
  processedNav,
  pathname,
  currentRole,
  user,
  logout,
}: MobileDrawerProps) {
  return (
    <AnimatePresence>
      {isMobileSidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleMobileSidebar}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--action-primary)]/20 text-[var(--action-primary)] flex items-center justify-center font-bold border border-[var(--action-primary)]/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">Gate Monitor</h2>
                  <p className="text-[10px] font-mono uppercase text-[var(--text-muted)]">{currentRole}</p>
                </div>
              </div>
              <button
                onClick={toggleMobileSidebar}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-xl transition-colors active:scale-95"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {processedNav.map((group) => (
                <div key={group.groupLabel}>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-1">
                    {group.groupLabel}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const active = isItemActive(pathname, item.href);
                      const Icon = (item.icon && iconMap[item.icon]) || Icons.HelpCircle;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                            active
                              ? "bg-[var(--action-primary)]/15 text-[var(--action-primary)] font-semibold border border-[var(--action-primary)]/30"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                          }`}
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          <span className="truncate flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[var(--action-primary)]/20 text-[var(--action-primary)] uppercase">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[var(--border)] flex items-center justify-between bg-[var(--bg-elevated)]/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-[var(--action-primary)]/20 text-[var(--action-primary)] flex items-center justify-center font-bold text-sm shrink-0 border border-[var(--action-primary)]/30">
                  {user?.name ? user.name.charAt(0).toUpperCase() : currentRole.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] capitalize truncate">
                    {currentRole}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  logout();
                }}
                className="p-2 text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

interface MobileBottomBarProps {
  toggleMobileSidebar: () => void;
  bottomTabs: NavItem[];
  pathname: string | null;
}

function MobileBottomBar({ toggleMobileSidebar, bottomTabs, pathname }: MobileBottomBarProps) {
  return (
    <div
      className="flex md:hidden sticky bottom-0 left-0 right-0 z-40 bg-[var(--bg-surface)]/90 backdrop-blur-xl border-t border-[var(--border)] pb-safe select-none"
      style={{ willChange: "transform" }}
    >
      <div className="w-full flex items-center justify-around h-16 px-1 overflow-x-auto no-scrollbar flex-nowrap gap-1">
        {/* Menu Button to trigger drawer */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="flex flex-col items-center justify-center h-full min-w-[64px] flex-1 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-95 transition-all min-h-[44px] shrink-0"
          aria-label="Open Navigation Drawer"
        >
          <Menu className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-semibold">Menu</span>
        </button>

        {/* Dynamic tabs */}
        {bottomTabs.map((item) => {
          const active = isItemActive(pathname, item.href);
          const Icon = (item.icon && iconMap[item.icon]) || Icons.HelpCircle;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center h-full min-w-[64px] flex-1 py-1 transition-all min-h-[44px] shrink-0 ${
                active
                  ? "text-[var(--action-primary)] font-semibold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon className="w-5 h-5 mb-1 shrink-0" />
              <span className="text-[10px] sm:text-xs whitespace-nowrap truncate max-w-[72px] text-center font-medium">{item.label}</span>
              <span
                className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-all ${
                  active ? "bg-[var(--action-primary)] opacity-100 scale-100" : "opacity-0 scale-0"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { role: storeRole, user, logout } = useAuthStore();
  const {
    isMobileSidebarOpen,
    toggleMobileSidebar,
    setMobileSidebarOpen,
    isSidebarCollapsed,
    toggleSidebarCollapse,
  } = useUIStore();

  const [role, setRole] = useState<Role | null>(null);

  // Determine active role based on current pathname and store
  useEffect(() => {
    let activeRole: Role = "admin";
    if (pathname?.startsWith("/sysadmin")) activeRole = "sysadmin";
    else if (pathname?.startsWith("/admin")) activeRole = "admin";
    else if (pathname?.startsWith("/gate")) activeRole = "operator";
    else if (pathname?.startsWith("/supervisor") || pathname?.startsWith("/warden")) {
      activeRole = storeRole === "warden" ? "warden" : "supervisor";
    } else if (pathname?.startsWith("/student")) activeRole = "student";
    else if (pathname?.startsWith("/parent")) activeRole = "parent";
    else if (storeRole) activeRole = storeRole;
    else {
      if (typeof window !== "undefined") {
        const storedRole = (sessionStorage.getItem("gate-monitor-role") ||
          localStorage.getItem("gate-monitor-role")) as Role;
        if (storedRole) activeRole = storedRole;
      }
    }
    setRole(activeRole);
  }, [storeRole, pathname]);

  const currentRole = role || "admin";
  const { navigation } = useNavigation(currentRole);

  const isAdminOrSysadmin = currentRole === "admin" || currentRole === "sysadmin";
  const assignedGateId = user?.gateId || "1";

  // Filter and process dynamic navigation items
  const processedNav: NavGroup[] = navigation.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => {
        if (
          !isAdminOrSysadmin &&
          (item.href?.includes("/admin/gates") || item.href === "/admin/gates/schedule")
        ) {
          return false;
        }
        return true;
      })
      .map((item) => {
        let href = item.href;
        if (href === "/gate/active") href = `/gate/${assignedGateId}`;
        else if (href === "/gate/history") href = `/gate/${assignedGateId}?tab=history`;
        else if (href === "/gate/manual") href = `/gate/${assignedGateId}?tab=scandesk&mode=manual`;
        return { ...item, href };
      }),
  }));

  // Top 4 navigation items for mobile bottom tab bar
  const flatItems = processedNav.flatMap((g) => g.items);
  const bottomTabs = getPriorityItems(currentRole, flatItems);

  return (
    <>
      <DesktopSidebar
        processedNav={processedNav}
        pathname={pathname}
        currentRole={currentRole}
        user={user}
        logout={logout}
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebarCollapse={toggleSidebarCollapse}
      />
      <MobileDrawer
        isMobileSidebarOpen={isMobileSidebarOpen}
        toggleMobileSidebar={toggleMobileSidebar}
        setMobileSidebarOpen={setMobileSidebarOpen}
        processedNav={processedNav}
        pathname={pathname}
        currentRole={currentRole}
        user={user}
        logout={logout}
      />
      <MobileBottomBar
        toggleMobileSidebar={toggleMobileSidebar}
        bottomTabs={bottomTabs}
        pathname={pathname}
      />
    </>
  );
}

export default Sidebar;