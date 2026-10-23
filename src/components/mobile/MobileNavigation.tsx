"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ScanLine,
  History,
  KeyRound,
  BarChart3,
  QrCode,
  FileText,
  User,
  UserCheck,
  Clock,
  Bell,
  Settings,
  Users,
  ShieldCheck,
  FileCheck,
  Inbox,
  Wrench,
  Utensils,
  GraduationCap,
  Briefcase,
  MapPin,
  Home,
  Shield,
  ClipboardList,
  PackageCheck,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";

interface TabItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function MobileNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role: storeRole, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine current role based on path or auth state
  let currentRole: Role = "admin";
  if (pathname?.startsWith("/sysadmin")) currentRole = "sysadmin";
  else if (pathname?.startsWith("/admin")) currentRole = "admin";
  else if (pathname?.startsWith("/gate") || pathname?.startsWith("/operator")) currentRole = "operator";
  else if (pathname?.startsWith("/student")) currentRole = "student";
  else if (pathname?.startsWith("/parent")) currentRole = "parent";
  else if (pathname?.startsWith("/visitor")) currentRole = "visitor";
  else if (pathname?.startsWith("/worker")) currentRole = "worker";
  else if (pathname?.startsWith("/staff")) currentRole = "staff";
  else if (pathname?.startsWith("/faculty")) currentRole = "faculty";
  else if (pathname?.startsWith("/mess")) currentRole = "mess_incharge";
  else if (pathname?.startsWith("/principal")) currentRole = "principal";
  else if (pathname?.startsWith("/vice-principal")) currentRole = "vice_principal";
  else if (pathname?.startsWith("/hod")) currentRole = "hod";
  else if (pathname?.startsWith("/oie")) currentRole = "oie";
  else if (pathname?.startsWith("/exam")) currentRole = "exam_branch";
  else if (pathname?.startsWith("/supervisor")) currentRole = "supervisor";
  else if (pathname?.startsWith("/caretaker")) currentRole = "caretaker";
  else if (pathname?.startsWith("/deputy-warden")) currentRole = "deputy_warden";
  else if (pathname?.startsWith("/hostel-manager")) currentRole = "hostel_manager";
  else if (storeRole) currentRole = storeRole;

  const assignedGateId = user?.gateId || "1";

  const getRoleTabs = (role: Role): TabItem[] => {
    switch (role) {
      case "operator":
        return [
          { label: "Scanner", href: `/gate/${assignedGateId}`, icon: ScanLine },
          { label: "History", href: `/gate/${assignedGateId}?tab=history`, icon: History },
          { label: "Manual", href: `/gate/${assignedGateId}?tab=scandesk&mode=manual`, icon: KeyRound },
          { label: "Metrics", href: "/metrics", icon: BarChart3 },
        ];
      case "student":
        return [
          { label: "Digital ID", href: "/student", icon: QrCode },
          { label: "Outpass", href: "/student/passes", icon: FileText },
          { label: "Activity", href: "/student/history", icon: History },
          { label: "Profile", href: "/profile", icon: User },
        ];
      case "parent":
      case "guardian":
        return [
          { label: "Ward Status", href: "/parent", icon: UserCheck },
          { label: "Requests", href: "/parent/requests", icon: Clock },
          { label: "Alerts", href: "/parent/students", icon: Bell },
          { label: "Profile", href: "/profile", icon: Settings },
        ];
      case "principal":
      case "vice_principal":
        return [
          { label: "Dashboard", href: "/principal", icon: Shield },
          { label: "Approvals", href: "/principal/approvals", icon: Inbox },
          { label: "Reports", href: "/principal/reports", icon: BarChart3 },
          { label: "Profile", href: "/profile", icon: User },
        ];
      case "hod":
        return [
          { label: "Dashboard", href: "/hod", icon: GraduationCap },
          { label: "Faculty", href: "/hod/faculty-overview", icon: Users },
          { label: "Students", href: "/hod/student-directory", icon: User },
          { label: "Profile", href: "/profile", icon: User },
        ];
      case "oie":
        return [
          { label: "Dashboard", href: "/oie", icon: FileCheck },
          { label: "Exams", href: "/oie/records", icon: GraduationCap },
          { label: "Access", href: "/oie/access-exceptions", icon: ShieldCheck },
          { label: "Profile", href: "/profile", icon: User },
        ];
      case "exam_branch":
        return [
          { label: "Dashboard", href: "/exam-branch", icon: GraduationCap },
          { label: "Passes", href: "/exam-branch/pass-queue", icon: Inbox },
          { label: "Records", href: "/exam-branch/records", icon: FileText },
          { label: "Profile", href: "/profile", icon: User },
        ];
      case "exam_superintendent":
        return [
          { label: "Dashboard", href: "/exam/superintendent", icon: GraduationCap },
          { label: "Access", href: "/exam/superintendent/access", icon: ShieldCheck },
          { label: "Reports", href: "/exam/superintendent/reports", icon: BarChart3 },
          { label: "Profile", href: "/profile", icon: User },
        ];
      case "supervisor":
        return [
          { label: "Dashboard", href: "/supervisor", icon: ShieldCheck },
          { label: "Approvals", href: "/supervisor/approvals", icon: Inbox },
          { label: "Reports", href: "/supervisor/reports", icon: BarChart3 },
          { label: "Profile", href: "/profile", icon: User },
        ];
      case "caretaker":
        return [
          { label: "Dashboard", href: "/caretaker", icon: Wrench },
          { label: "Workers", href: "/caretaker/workers", icon: Users },
          { label: "History", href: "/caretaker/maintenance", icon: History },
          { label: "Profile", href: "/profile", icon: User },
        ];
      case "deputy_warden":
        return [
          { label: "Dashboard", href: "/deputy-warden", icon: Shield },
          { label: "Approvals", href: "/deputy-warden/delegated-approvals", icon: Inbox },
          { label: "Outpass", href: "/deputy-warden/outpass-queue", icon: MapPin },
          { label: "Profile", href: "/profile", icon: User },
        ];
      case "hostel_manager":
        return [
          { label: "Dashboard", href: "/hostel-manager", icon: Home },
          { label: "Tickets", href: "/hostel-manager/tickets", icon: Inbox },
          { label: "History", href: "/hostel-manager/records", icon: History },
          { label: "Profile", href: "/profile", icon: User },
        ];
      case "mess_incharge":
        return [
          { label: "Dashboard", href: "/mess", icon: Utensils },
          { label: "Menu", href: "/mess/menu-management", icon: FileText },
          { label: "Reviews", href: "/mess/reviews", icon: Bell },
          { label: "Profile", href: "/profile", icon: User },
        ];
      case "worker":
        return [
          { label: "Dashboard", href: "/worker", icon: Wrench },
          { label: "Work", href: "/worker/work-orders", icon: PackageCheck },
          { label: "Shifts", href: "/worker/shifts", icon: Clock },
          { label: "Profile", href: "/profile", icon: User },
        ];
      case "staff":
        return [
          { label: "Dashboard", href: "/staff", icon: Briefcase },
          { label: "Requests", href: "/staff/requests", icon: Inbox },
          { label: "History", href: "/staff/history", icon: History },
          { label: "Profile", href: "/profile", icon: User },
        ];
      case "faculty":
        return [
          { label: "Dashboard", href: "/faculty", icon: GraduationCap },
          { label: "Classes", href: "/faculty/my-classes", icon: Clock },
          { label: "Requests", href: "/faculty/permissions", icon: Inbox },
          { label: "Profile", href: "/profile", icon: User },
        ];
      case "visitor":
        return [
          { label: "Dashboard", href: "/visitor", icon: MapPin },
          { label: "Status", href: "/visitor/approval-status", icon: Clock },
          { label: "Visit", href: "/visitor/visit-details", icon: FileText },
          { label: "Profile", href: "/profile", icon: User },
        ];
      case "admin":
      case "sysadmin":
      default:
        return [
          { label: "Occupancy", href: "/admin", icon: Users },
          { label: "Gates", href: "/admin/gates", icon: ShieldCheck },
          { label: "Analytics", href: "/admin/reports", icon: BarChart3 },
          { label: "Audit", href: "/sysadmin/audit", icon: FileCheck },
        ];
    }
  };

  const tabs = getRoleTabs(currentRole);

  const isTabActive = (href: string) => {
    if (!pathname) return false;
    const [basePath, query] = href.split("?");
    if (query) {
      if (pathname !== basePath) return false;
      const tabParam = new URLSearchParams(query).get("tab");
      const currentTab = searchParams?.get("tab");
      return currentTab === tabParam;
    }
    if (href === "/admin" || href === "/student" || href === "/parent") {
      return pathname === href && !searchParams?.get("tab");
    }
    return pathname === basePath && !searchParams?.get("tab");
  };

  if (!mounted) return null;

  return (
    <nav
      aria-label="Mobile navigation bar"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 pb-safe select-none"
    >
      <div className="grid grid-cols-4 h-14 max-w-md mx-auto items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = isTabActive(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              title={tab.label}
              className={`relative flex flex-col items-center justify-center min-h-[48px] min-w-[44px] px-1 py-1 transition-all active-tap ${
                isActive ? "text-emerald-400 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-emerald-400 scale-110" : "text-slate-400"}`} />
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1 transition-all ${
                  isActive ? "bg-emerald-400 opacity-100 scale-100 shadow-[0_0_6px_#10b981]" : "opacity-0 scale-0"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileNavigation;
