"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
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
  supervisor: [
    { href: "/supervisor/live", label: "Live", icon: Radio },
    { href: "/supervisor/corrections", label: "Corrections", icon: ShieldAlert },
    { href: "/admin/alerts", label: "Alerts", icon: AlertTriangle },
    { href: "/supervisor/live?tab=profile", label: "Profile", icon: User },
  ],
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/gate/1", label: "Gates", icon: Building },
    { href: "/admin?tab=profile", label: "Profile", icon: User },
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

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role } = useAuthStore();

  const currentRole = (role as Role) || "operator";
  const tabs = ROLE_TABS[currentRole] || ROLE_TABS.operator;

  const currentTabParam = searchParams?.get("tab") || null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-surface)]/90 backdrop-blur-xl border-t border-[var(--border)] pb-safe shadow-2xl select-none">
      <div className="h-16 grid grid-cols-4 items-center px-1">
        {tabs.map((tab) => {
          const [basePath, searchStr] = tab.href.split("?");
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
              href={tab.href}
              className={`relative flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                isActive
                  ? "text-[var(--action-primary)] font-bold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[var(--action-primary)] rounded-full" />
              )}
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight truncate max-w-[64px]">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
