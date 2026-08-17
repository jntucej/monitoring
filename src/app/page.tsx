"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  LayoutDashboard,
  Settings,
  Users,
  GraduationCap,
  Building2,
  ScanLine,
  LogIn,
  Activity,
  Lock,
  ArrowRight,
} from "lucide-react";
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
    description: "Scan QR codes, instant student profile preview, direction toggle, reason selection & offline buffering",
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
    description: "Campus analytics, daily mobility trends, student exit reports & curfew violation logs",
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
    label: "Student Digital ID",
    subtitle: "Enrolled Undergraduates",
    description: "Dynamic QR hall ticket, active out-passes, scan history & gate entry/exit notifications",
    icon: <GraduationCap className="w-6 h-6" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "hover:border-blue-500/50 hover:shadow-blue-500/10",
    href: "/student",
    badge: "Pass Authority",
  },
  {
    role: "parent",
    label: "Parent Portal",
    subtitle: "Guardians & Parents",
    description: "Real-time movement updates, out-pass request approvals & child location status",
    icon: <Users className="w-6 h-6" />,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "hover:border-rose-500/50 hover:shadow-rose-500/10",
    href: "/parent",
    badge: "Guardian",
  },
];

export default function Home() {
  const router = useRouter();

  const handlePortalAccess = (role: Role, href: string) => {
    sessionStorage.setItem("gate-monitor-role", role);
    router.push(href);
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[var(--bg-base)] p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none">
      {/* Background Mesh Gradient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[var(--action-primary)]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-6xl z-10 space-y-10">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              JNTUH UCoEJ Security Grid • Operational Online
            </span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--action-primary)]/10 text-[var(--action-primary)] border border-[var(--action-primary)]/20 flex items-center justify-center shadow-lg">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                JNTUH University College of Engineering
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[var(--text-muted)]">
                Jagtial (Nachupally / Kondagattu) • Digital Gate & Student Pass Subsystem
              </p>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => router.push("/login")}
              className="touch-target-primary px-5 rounded-xl bg-[var(--action-primary)] text-white font-bold text-xs sm:text-sm hover:opacity-95 transition-all shadow-md flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Staff / Student PIN Login</span>
            </button>
          </div>
        </motion.div>

        {/* Portals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PORTALS.map((portal, i) => (
            <motion.button
              key={portal.role}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              onClick={() => handlePortalAccess(portal.role, portal.href)}
              className={`group text-left p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] ${portal.border} transition-all duration-200 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-12 h-12 rounded-xl ${portal.bg} ${portal.color} flex items-center justify-center border border-white/5 shadow-inner`}
                  >
                    {portal.icon}
                  </div>
                  {portal.badge && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                      {portal.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--action-primary)] transition-colors">
                  {portal.label}
                </h3>
                <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
                  {portal.subtitle}
                </p>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2">
                  {portal.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs font-bold text-[var(--text-muted)] group-hover:text-[var(--action-primary)] transition-colors">
                <span>Enter Workstation</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* System Footer Info */}
        <div className="pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>NAAC A+ Accredited Campus • Roll Number Blueprint Compliant</span>
          </div>
          <p className="font-mono text-[11px]">
            © 2026 JNTUH CEJ • Security Infrastructure Engine
          </p>
        </div>
      </div>
    </main>
  );
}
