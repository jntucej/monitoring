"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";
import {
  ShieldCheck,
  LayoutDashboard,
  Settings,
  Users,
  GraduationCap,
  Building2,
  ScanLine,
  LogIn,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { Role } from "@/lib/types";

const PORTALS: Array<{
  role: Role;
  label: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  href: string;
  badge?: string;
}> = [
  {
    role: "operator",
    label: "Gate Operator Desk",
    subtitle: "Security Gate Officers",
    description: "Scan QR codes, instant profile preview, direction toggle, reason selection & offline buffering",
    icon: <ScanLine className="w-6 h-6" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "hover:border-emerald-500/50 hover:shadow-emerald-500/10",
    href: "/gate/1",
    badge: "Active Station",
  },
  {
    role: "supervisor",
    label: "Supervisor Operations",
    subtitle: "Head Warden & Security Chief",
    description: "Real-time gate feed, pending corrections audit, pass approval queue & curfew tracking",
    icon: <ShieldCheck className="w-6 h-6" />,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "hover:border-sky-500/50 hover:shadow-sky-500/10",
    href: "/supervisor/live",
    badge: "Live Feed",
  },
  {
    role: "admin",
    label: "College Administration",
    subtitle: "Principal & Academic Deans",
    description: "Campus analytics, daily mobility trends, exit reports & curfew violation logs",
    icon: <LayoutDashboard className="w-6 h-6" />,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "hover:border-violet-500/50 hover:shadow-violet-500/10",
    href: "/admin",
    badge: "Analytics",
  },
  {
    role: "sysadmin",
    label: "System Configuration",
    subtitle: "IT Infrastructure & Security",
    description: "User provisioning, gate camera settings, system audit trails & Supabase security hardening",
    icon: <Settings className="w-6 h-6" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "hover:border-amber-500/50 hover:shadow-amber-500/10",
    href: "/sysadmin",
    badge: "SysAdmin",
  },
  {
    role: "student",
    label: "Portal",
    subtitle: "Campus Members",
    description: "Dynamic QR or ID login, access history & gate entry/exit notifications",
    icon: <GraduationCap className="w-6 h-6" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "hover:border-blue-500/50 hover:shadow-blue-500/10",
    href: "/login/student",
    badge: "Access",
  },
  {
    role: "guardian",
    label: "Guardian Portal",
    subtitle: "Guardians & Wards",
    description: "Real-time movement updates, out-pass request approvals & location status",
    icon: <Users className="w-6 h-6" />,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "hover:border-rose-500/50 hover:shadow-rose-500/10",
    href: "/login/guardian",
    badge: "Guardian",
  },
];

export default function Home() {
  const router = useRouter();

  const handlePortalAccess = (role: Role, href: string) => {
    const { authenticated, user } = useAuthStore.getState();
    if (authenticated && user && (user.role === role || user.role === "admin" || user.role === "sysadmin")) {
      sessionStorage.setItem("gate-monitor-role", user.role);
      router.push(href);
    } else {
      router.push(href);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-4">
      {/* Main Content Area */}
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-3xl font-bold px-1 mb-6 cursor-pointer hover:text-indigo-400 transition-colors">
          <Link href="/about">JNTUH CEJ Monitoring</Link>
        </h2>
        
        <section className="space-y-4" id="main-content-flow">
          {/* Grid of Portal Access Points */}
          <div className="grid grid-cols-2 gap-3">
            {PORTALS.map((portal) => (
              <motion.div
                key={portal.role}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePortalAccess(portal.role, portal.href)}
                className="glass-card p-4 rounded-3xl text-left border-slate-800/50 hover:border-indigo-500/50 hover:cursor-pointer transition-all duration-300 ease-out flex flex-col gap-3 shadow-sm hover:shadow-lg hover:shadow-indigo-500/30 ring-1 ring-white/5 hover:ring-indigo-500/30"
              >
                <div className={`p-3 rounded-2xl w-fit transition-colors duration-300 ${portal.bg} ${portal.color}`}>
                  {portal.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {portal.label.split(" ")[0]}
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-relaxed">
                    {portal.subtitle}
                  </p>
                </div>
                <div className="mt-auto pt-2 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Enter
                  </span>
                  <ArrowRight className="w-3 h-3 text-[var(--text-muted)]" />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="glass-card mt-4 p-4 rounded-3xl border-slate-800/50">
            <h3 className="text-sm font-semibold mb-2">Live Status Overview</h3>
            <p className="text-xs text-[var(--text-muted)]">
              All gates currently operational. System stability at 100%.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
