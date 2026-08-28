"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
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
  ChevronDown,
  ChevronRight,
  UserCheck,
  History,
  QrCode,
  Sliders,
  Bell,
  CheckSquare,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Shield,
  HardHat,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { Role } from "@/lib/types";
import { useAuthStore } from "@/stores/authStore";
import { useNavigation, NavGroup as DynamicNavGroup } from "@/hooks/useNavigation";
import { useUIStore } from "@/stores/uiStore";

interface NavGroup {
  groupLabel: string;
  items: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }>;
}

const iconMap: Record<string, any> = Icons;

const ROLE_LABELS: Record<string, string> = {
  operator: "Gate Guard / Operator",
  supervisor: "Gate Supervisor",
  admin: "Campus Administrator",
  sysadmin: "System Administrator",
  guardian: "Guardian Portal",
  parent: "Guardian Portal", // legacy
  student: "My Portal",
  faculty: "Department Portal",
  staff: "Staff Portal",
  worker: "Worker Portal",
  warden: "Hostel Warden",
};

import { useCollegeInfo } from "@/hooks/useCollegeInfo";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role: storeRole, user, logout } = useAuthStore();
  const { isMobileSidebarOpen, toggleMobileSidebar } = useUIStore();
  const { college, loading: collegeLoading } = useCollegeInfo();

  const [role, setRole] = useState<Role | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const tempRole = role || "admin";
  const { navigation, loading: navLoading } = useNavigation(tempRole);

  useEffect(() => {
    let activeRole: Role = "admin";
    if (pathname.startsWith("/sysadmin")) {
      activeRole = "sysadmin";
    } else if (pathname.startsWith("/admin")) {
      activeRole = "admin";
    } else if (pathname.startsWith("/gate")) {
      activeRole = "operator";
    } else if (pathname.startsWith("/supervisor") || pathname.startsWith("/warden")) {
      activeRole = storeRole === "warden" ? "warden" : "supervisor";
    } else if (pathname.startsWith("/student")) {
      activeRole = "student";
    } else if (pathname.startsWith("/parent")) {
      activeRole = "parent";
    } else if (storeRole) {
      activeRole = storeRole;
    } else {
      const storedRole = (sessionStorage.getItem("gate-monitor-role") || localStorage.getItem("gate-monitor-role")) as Role;
      if (storedRole) {
        activeRole = storedRole;
      }
    }
    setRole(activeRole);
  }, [storeRole, pathname]);

  const currentRole = role || "admin";
  const isAdminOrSysadmin = currentRole === "admin" || currentRole === "sysadmin";
  const rawNavGroups = navigation || [];
  const assignedGateId = user?.gateId || "1";
  const navGroups = rawNavGroups.map((group: any) => ({
    ...group,
    items: group.items
      .filter((item: any) => {
        // Hide gate management/configuration links from non-admin roles
        if (!isAdminOrSysadmin && (item.href?.includes("/admin/gates") || item.href === "/admin/gates/schedule")) {
          return false;
        }
        return true;
      })
      .map((item: any) => {
        let href = item.href;
        if (href === "/gate/active") {
          href = `/gate/${assignedGateId}`;
        } else if (href === "/gate/history") {
          href = `/gate/${assignedGateId}?tab=history`;
        } else if (href === "/gate/manual") {
          href = `/gate/${assignedGateId}?tab=scandesk&mode=manual`;
        }
        return { ...item, href };
      })
  }));

  const handleLogout = async () => {
    sessionStorage.removeItem("gate-monitor-role");
    localStorage.removeItem("gate-monitor-role");
    await logout();
    router.push("/login");
  };

  const toggleGroup = (groupLabel: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  const sidebarContent = (
    <aside
      className={`${
        isCollapsed ? "w-20" : "w-64"
      } flex-shrink-0 flex flex-col h-full bg-[var(--bg-surface)] border-r border-[var(--border)] select-none transition-all duration-300`}
    >
      {/* Header Branding */}
      <div className="p-4 flex items-center justify-between border-b border-[var(--border)] min-h-[65px]">
        <Link href="/" className="flex items-center gap-3 group min-w-0">
          <div className="p-2 rounded-xl bg-[var(--action-primary)]/10 text-[var(--action-primary)] group-hover:scale-105 transition-transform shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 truncate">
              <div className="font-bold text-sm leading-tight text-[var(--text-primary)] truncate">
                {collegeLoading ? 'Loading...' : college?.shortName || 'Loading...'}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] font-medium truncate">Gate Monitor</div>
            </div>
          )}
        </Link>

        {/* Mobile close or Desktop Collapse Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleMobileSidebar}
            className="lg:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Active Role Workspace Card */}
      {!isCollapsed && (
        <div className="px-4 py-3 bg-[var(--bg-elevated)]/60 border-b border-[var(--border)] space-y-1">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
            <span>Workspace</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-[var(--action-primary)]/15 text-[var(--action-primary)] border border-[var(--action-primary)]/20">
              {currentRole.toUpperCase()}
            </span>
          </div>
          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
            {ROLE_LABELS[currentRole] || currentRole}
          </p>
        </div>
      )}

      {/* Interactive Accordion Navigation Groups */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar">
        {navLoading ? <div className="p-4 text-xs animate-pulse text-[var(--text-muted)] text-center font-semibold">Loading Navigation...</div> : navGroups.map((group) => {
          const isGroupCollapsed = collapsedGroups[group.groupLabel];
          return (
            <div key={group.groupLabel} className="space-y-1">
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.groupLabel)}
                  className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-2 py-1 hover:text-[var(--text-primary)] transition-colors"
                >
                  <span>{group.groupLabel}</span>
                  {isGroupCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}

              {!isGroupCollapsed && (
                <div className="space-y-1">
                  {group.items.map((item: any) => {
                    const isExactMatch = pathname === item.href;
                    const isSubPathMatch =
                      item.href !== "/admin" &&
                      item.href !== "/" &&
                      item.href !== "/hod" &&
                      pathname.startsWith(item.href);
                    const isActive = isExactMatch || isSubPathMatch;
                    const Icon = (item.icon && typeof item.icon === 'string' ? iconMap[item.icon] : item.icon) || Icons.HelpCircle;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          if (isMobileSidebarOpen) toggleMobileSidebar();
                        }}
                        title={isCollapsed ? item.label : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                          isActive
                            ? "bg-[var(--action-primary)] text-white shadow-md font-semibold"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-[var(--text-muted)]"}`} />
                        {!isCollapsed && (
                          <div className="flex-1 flex items-center justify-between min-w-0">
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span
                                className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                                  isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Profile & Role Switcher Footer */}
      <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-base)]/40 space-y-2">
        <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[var(--action-primary)]/20 text-[var(--action-primary)] flex items-center justify-center text-xs font-bold shrink-0 border border-[var(--action-primary)]/30">
              {user?.name ? user.name.charAt(0).toUpperCase() : currentRole.charAt(0).toUpperCase()}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {user?.name || (ROLE_LABELS[currentRole] ?? "User")}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] truncate capitalize font-mono">
                  {user?.employeeId || currentRole}
                </p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--action-danger)] hover:bg-[var(--action-danger)]/10 transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {!isCollapsed && (
          <Link
            href="/login"
            className="w-full py-1.5 px-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[11px] text-[var(--text-muted)] hover:text-[var(--action-primary)] font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Switch Role / Portal</span>
          </Link>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">{sidebarContent}</div>

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={toggleMobileSidebar}
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
