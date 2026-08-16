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
  ChevronDown,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import type { Role } from "@/lib/types";

const NAV_ITEMS = {
  operator: [
    { href: "/gate/1", label: "Gate 1", icon: ScanLine },
    { href: "/gate/2", label: "Gate 2", icon: ScanLine },
  ],
  supervisor: [
    { href: "/supervisor/live", label: "Live Feed", icon: LayoutDashboard },
    { href: "/supervisor/corrections", label: "Corrections", icon: ShieldCheck },
  ],
  admin: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  sysadmin: [{ href: "/sysadmin", label: "Settings", icon: Settings }],
  parent: [{ href: "/parent", label: "Dashboard", icon: Users }],
  student: [{ href: "/student", label: "My ID", icon: GraduationCap }],
  warden: [{ href: "/sysadmin", label: "Settings", icon: Settings }],
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const storedRole = sessionStorage.getItem("gate-monitor-role") as Role;
    if (storedRole) {
      setRole(storedRole);
    } else {
      router.push("/");
    }
  }, [router]);

  const navItems = role ? NAV_ITEMS[role] : [];

  const handleLogout = () => {
    sessionStorage.removeItem("gate-monitor-role");
    router.push("/");
  };

  if (!role) {
    return null; // or a loading spinner
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-[var(--bg-surface)] border-r border-[var(--border)]">
      <div className="p-4 flex items-center gap-3 border-b border-[var(--border)]">
        <Building2 className="w-6 h-6 text-[var(--action-primary)]" />
        <span className="font-semibold">Gate Monitor</span>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname === item.href
                ? "bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
                : "text-[var(--text-secondary)] hover:bg-white/5"
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold">
              {role.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium capitalize">{role}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-md text-[var(--text-muted)] hover:bg-white/5"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
