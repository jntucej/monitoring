"use client";

import Link from "next/link";
import {
  ShieldCheck,
  LayoutDashboard,
  Settings,
  Users,
  GraduationCap,
  Building2,
  ScanLine,
  LogOut,
  X,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { Role } from "@/lib/types";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";

const NAV_ITEMS: Record<string, Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>> = {
  operator: [
    { href: "/gate/1", label: "Gate 1 Scanner", icon: ScanLine },
    { href: "/gate/2", label: "Gate 2 Scanner", icon: ScanLine },
  ],
  supervisor: [
    { href: "/supervisor/live", label: "Live Feed", icon: LayoutDashboard },
    { href: "/supervisor/corrections", label: "Corrections Desk", icon: ShieldCheck },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/students", label: "Student Roster", icon: GraduationCap },
    { href: "/admin/alerts", label: "Security Alerts", icon: AlertTriangle },
    { href: "/admin/reports", label: "Gate Reports", icon: FileSpreadsheet },
  ],
  sysadmin: [
    { href: "/sysadmin", label: "System Console", icon: Settings },
  ],
  parent: [
    { href: "/parent", label: "Child Overview", icon: Users },
  ],
  student: [
    { href: "/student", label: "Digital ID Card", icon: GraduationCap },
  ],
  warden: [
    { href: "/sysadmin", label: "Settings", icon: Settings },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  operator: "Gate Operator",
  supervisor: "Gate Supervisor",
  admin: "Campus Admin",
  sysadmin: "System Admin",
  parent: "Parent Portal",
  student: "Student Portal",
  warden: "Hostel Warden",
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role: storeRole, user, logout } = useAuthStore();
  const { isMobileSidebarOpen, toggleMobileSidebar } = useUIStore();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    if (storeRole) {
      setRole(storeRole);
    } else {
      const storedRole = (sessionStorage.getItem("gate-monitor-role") || localStorage.getItem("gate-monitor-role")) as Role;
      if (storedRole) {
        setRole(storedRole);
      } else if (pathname.includes("/admin")) {
        setRole("admin");
      } else if (pathname.includes("/gate")) {
        setRole("operator");
      } else if (pathname.includes("/supervisor")) {
        setRole("supervisor");
      } else if (pathname.includes("/student")) {
        setRole("student");
      } else if (pathname.includes("/parent")) {
        setRole("parent");
      } else if (pathname.includes("/sysadmin")) {
        setRole("sysadmin");
      }
    }
  }, [storeRole, pathname]);

  const currentRole = role || "admin";
  const navItems = NAV_ITEMS[currentRole] || [];

  const handleLogout = async () => {
    sessionStorage.removeItem("gate-monitor-role");
    localStorage.removeItem("gate-monitor-role");
    await logout();
  };

  const navContent = (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-[var(--bg-surface)] border-r border-[var(--border)] select-none">
      {/* Header Branding */}
      <div className="p-4 flex items-center justify-between border-b border-[var(--border)]">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2 rounded-lg bg-[var(--action-primary)]/10 text-[var(--action-primary)] group-hover:scale-105 transition-transform">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight text-[var(--text-primary)]">JNTUH UCoEJ</div>
            <div className="text-xs text-[var(--text-muted)] font-medium">Gate Monitor</div>
          </div>
        </Link>
        <button
          onClick={toggleMobileSidebar}
          className="lg:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Badge */}
      <div className="px-4 py-3 bg-[var(--bg-base)]/50 border-b border-[var(--border)]">
        <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] mb-1">
          Active Workspace
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--action-primary)]">
            {ROLE_LABELS[currentRole] || currentRole}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[var(--action-primary)]/15 text-[var(--action-primary)]">
            ONLINE
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (isMobileSidebarOpen) toggleMobileSidebar();
              }}
              className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-[var(--action-primary)] text-white shadow-sm font-semibold"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[var(--text-muted)]"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout Footer */}
      <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-base)]/30">
        <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[var(--action-primary)]/20 text-[var(--action-primary)] flex items-center justify-center text-xs font-bold shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : currentRole.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {user?.name || (ROLE_LABELS[currentRole] ?? "User")}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate capitalize">{user?.employeeId || currentRole}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--action-danger)] hover:bg-[var(--action-danger)]/10 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">{navContent}</div>

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={toggleMobileSidebar}
          />
          <div className="relative z-10 w-64 max-w-[80vw] h-full shadow-2xl">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
