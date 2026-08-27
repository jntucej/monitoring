"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  Activity,
  ShieldAlert,
  Landmark,
  Database,
  Clock,
  Sparkles,
  Lock,
  DoorOpen,
  Bell,
  Layout,
  GraduationCap,
  Briefcase,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

const NAV = [
  {
    group: "System Governance",
    items: [
      { href: "/sysadmin", label: "System Overview", icon: LayoutDashboard },
      { href: "/sysadmin/students", label: "Manage Students", icon: GraduationCap },
      { href: "/sysadmin/staff", label: "Manage Staff", icon: Briefcase },
      { href: "/sysadmin/roles", label: "Roles & Permissions", icon: UserCheck },
      { href: "/sysadmin/audit", label: "Audit Telemetry", icon: ShieldAlert },
      { href: "/sysadmin/departments", label: "Departments & HOD", icon: Building2 },
      { href: "/sysadmin/promotions", label: "Role Promotions", icon: Users },
      { href: "/sysadmin/sessions", label: "Active Sessions", icon: Lock },
      { href: "/sysadmin/health", label: "System Health", icon: Activity },
    ],
  },
  {
    group: "Integrations & Automation",
    items: [
      { href: "/sysadmin/sso", label: "SSO Configuration", icon: Landmark },
      { href: "/sysadmin/integrations", label: "Integration Hub", icon: Database },
      { href: "/sysadmin/jobs", label: "Scheduled Jobs", icon: Clock },
      { href: "/sysadmin/scheduling", label: "Smart Scheduling", icon: Sparkles },
    ],
  },
  {
    group: "Security & Policy",
    items: [
      { href: "/sysadmin/security", label: "Zero-Trust Security", icon: ShieldCheck },
      { href: "/sysadmin/compliance", label: "Compliance & Retention", icon: Landmark },
      { href: "/sysadmin/exit-reasons", label: "Exit Reasons", icon: DoorOpen },
      { href: "/sysadmin/alerts/rules", label: "Alert Rules", icon: Bell },
      { href: "/sysadmin/navigation", label: "Navigation Editor", icon: Layout },
    ],
  },
];

export default function SysadminStandaloneShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const isActive = (href: string) =>
    href === "/sysadmin" ? pathname === "/sysadmin" : pathname?.startsWith(href);

  return (
    <div className="min-h-screen w-full flex bg-[#0b0f1a] text-slate-100">
      {/* Standalone SysAdmin Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-slate-800 bg-[#0d1220]">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center ring-1 ring-rose-500/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight">SysAdmin</p>
              <p className="text-[10px] text-slate-400 font-mono uppercase">Control Room</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {NAV.map((group) => (
            <div key={group.group}>
              <p className="px-3 pb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                        active
                          ? "bg-rose-600/15 text-rose-300 ring-1 ring-rose-500/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
<div className="p-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-rose-600/20 text-rose-300 flex items-center justify-center text-xs font-bold ring-1 ring-rose-500/30 shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : "S"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{user?.name || "System Admin"}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">SYSADMIN</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <Link
            href="/login"
            className="w-full py-1.5 px-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-[11px] text-slate-400 hover:text-rose-300 text-center font-semibold block"
          >
            Exit to Portal Login
          </Link>
        </div>
</aside>

      {/* Main Standalone Workspace */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 bg-[#0d1220]/90 backdrop-blur-xl border-b border-slate-800 select-none">
          <p className="text-sm font-bold tracking-tight">🔐 System Administration Console</p>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-600/10 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase">
              <ShieldCheck className="w-3 h-3" /> Elevated Security
            </span>
            <button
              onClick={logout}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}