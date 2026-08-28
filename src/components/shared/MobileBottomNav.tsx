"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine,
  BarChart3,
  History,
  User,
  Radio,
  ShieldAlert,
  AlertTriangle,
  LayoutDashboard,
  Users,
  Building,
  QrCode,
  FileCheck,
  Clock,
  Heart,
  Settings,
  Menu,
  X,
  Sparkles,
  Smartphone,
  LogOut,
  ChevronRight,
  Shield,
  Activity,
  FileText,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import type { Role } from "@/lib/types";

interface NavTab {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_TABS: Record<string, NavTab[]> = {
  operator: [
    { href: "/gate/1", label: "Scan", icon: ScanLine },
    { href: "/gate/1?tab=stats", label: "Stats", icon: BarChart3 },
    { href: "/gate/1?tab=history", label: "History", icon: History },
    { href: "/gate/1?tab=profile", label: "Profile", icon: User },
  ],
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/gates", label: "Gates", icon: Building },
    { href: "/profile", label: "Profile", icon: User },
  ],
  student: [
    { href: "/student", label: "ID Card", icon: QrCode },
    { href: "/student?tab=passes", label: "Passes", icon: FileCheck },
    { href: "/student?tab=history", label: "History", icon: Clock },
    { href: "/student?tab=profile", label: "Profile", icon: User },
  ],
  parent: [
    { href: "/parent", label: "Child", icon: Heart },
    { href: "/parent?tab=passes", label: "Passes", icon: FileCheck },
    { href: "/parent?tab=settings", label: "Settings", icon: Settings },
    { href: "/parent?tab=profile", label: "Profile", icon: User },
  ],
  sysadmin: [
    { href: "/sysadmin", label: "Console", icon: Settings },
    { href: "/admin/students", label: "Users", icon: Users },
    { href: "/admin/alerts", label: "Alerts", icon: AlertTriangle },
    { href: "/sysadmin?tab=profile", label: "Profile", icon: User },
  ],
};

const EXTRA_COLUMN_LINKS: Record<string, NavTab[]> = {
  admin: [{ href: "/admin/alerts", label: "Security & Flags", icon: ShieldAlert }],
  operator: [{ href: "/admin/alerts", label: "Security Radar", icon: ShieldAlert }],
  sysadmin: [{ href: "/sysadmin/audit", label: "Audit Logs", icon: FileText }],
};

function ColumnSideDrawer({
  isOpen,
  onClose,
  activeRole,
  tabs,
  extraLinks,
}: {
  isOpen: boolean;
  onClose: () => void;
  activeRole: string;
  tabs: NavTab[];
  extraLinks: NavTab[];
}) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 bg-black/75 backdrop-blur-sm z-50"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="md:hidden fixed inset-y-0 left-0 w-[80%] max-w-xs bg-slate-950 z-50 flex flex-col justify-between p-4 border-r border-[var(--border-strong)] text-white shadow-2xl"
          >
            <div className="space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : activeRole.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white truncate max-w-[120px]">{user?.name || "Campus Desk"}</h3>
                    <p className="text-[9px] text-emerald-400 font-mono font-bold uppercase">{activeRole} Panel</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 px-2 mb-1">Column Menu</p>
                {tabs.map((tab) => {
                  let href = tab.href;
                  if (href.startsWith("/gate/1") && user?.gateId) href = href.replace("/gate/1", `/gate/${user.gateId}`);
                  const Icon = tab.icon;
                  const isActive = pathname === href.split("?")[0];
                  return (
                    <Link
                      key={tab.label}
                      href={href}
                      onClick={onClose}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold ${
                        isActive ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold" : "text-slate-300 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <button onClick={() => { onClose(); logout(); }} className="w-full py-2 px-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" />
                <span>Sign Out Session</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role, user } = useAuthStore();
  const [isColumnDrawerOpen, setIsColumnDrawerOpen] = useState(false);

  let activeRole: string = role || "";
  if (pathname?.startsWith("/admin")) {
    activeRole = "admin";
  } else if (pathname?.startsWith("/sysadmin")) {
    activeRole = "sysadmin";
  } else if (pathname?.startsWith("/student")) {
    activeRole = "student";
  } else if (pathname?.startsWith("/parent")) {
    activeRole = "parent";
  } else if (pathname?.startsWith("/gate")) {
    activeRole = "operator";
  } else if (!activeRole) {
    activeRole = "admin";
  }

  const tabs = ROLE_TABS[activeRole] || ROLE_TABS.admin;
  const extraLinks = EXTRA_COLUMN_LINKS[activeRole] || [];
  const currentTabParam = searchParams?.get("tab") || null;

  return (
    <>
      <ColumnSideDrawer
        isOpen={isColumnDrawerOpen}
        onClose={() => setIsColumnDrawerOpen(false)}
        activeRole={activeRole}
        tabs={tabs}
        extraLinks={extraLinks}
      />
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-surface)]/90 backdrop-blur-xl border-t border-[var(--border)] pb-safe shadow-2xl select-none">
        <div className="h-16 grid grid-cols-5 items-center px-1">
          <button
            onClick={() => setIsColumnDrawerOpen(true)}
            className="flex flex-col items-center justify-center py-1 text-slate-400 hover:text-white transition-all active:scale-95"
          >
            <div className="p-1 rounded-lg bg-[var(--action-primary)]/10 text-[var(--action-primary)] border border-[var(--action-primary)]/20 mb-0.5">
              <Menu className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold tracking-tight">MENU</span>
          </button>
          {tabs.map((tab) => {
            let tabHref = tab.href;
            const assignedGateId = user?.gateId || "1";
            if (tab.href.startsWith("/gate/1")) {
              tabHref = tab.href.replace("/gate/1", `/gate/${assignedGateId}`);
            }

            const [basePath, searchStr] = tabHref.split("?");
            const targetTabParam = searchStr ? new URLSearchParams(searchStr).get("tab") : null;

            let isActive = false;
            if (pathname === basePath) {
              if (targetTabParam) {
                isActive = currentTabParam === targetTabParam;
              } else {
                isActive = !currentTabParam;
              }
            } else if (basePath !== "/" && pathname.startsWith(basePath) && basePath.length > 1) {
              if (targetTabParam) {
                isActive = currentTabParam === targetTabParam;
              } else {
                isActive = !currentTabParam;
              }
            }

            const Icon = tab.icon;

            return (
              <Link
                key={tab.label}
                href={tabHref}
                className={`relative flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                  isActive
                    ? "text-[var(--action-primary)] font-bold"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--action-primary)] rounded-full" />
                )}
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] tracking-tight truncate max-w-[56px]">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
