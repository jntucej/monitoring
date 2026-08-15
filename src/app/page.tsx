"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  UserCog,
  LayoutDashboard,
  Settings,
  Users,
  GraduationCap,
  Building2,
  ScanLine,
} from "lucide-react";
import type { Role } from "@/lib/types";

const ROLES: Array<{
  role: Role;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  href: string;
}> = [
  {
    role: "operator",
    label: "Gate Operator",
    description: "Scan QR codes & record entry/exit",
    icon: <ScanLine className="w-6 h-6" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "hover:border-emerald-500/50",
    href: "/operator/gate-1",
  },
  {
    role: "supervisor",
    label: "Gate Supervisor",
    description: "Review logs, corrections & passes",
    icon: <ShieldCheck className="w-6 h-6" />,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "hover:border-sky-500/50",
    href: "/supervisor/live",
  },
  {
    role: "admin",
    label: "Admin",
    description: "Full monitoring, analytics & reports",
    icon: <LayoutDashboard className="w-6 h-6" />,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "hover:border-violet-500/50",
    href: "/admin",
  },
  {
    role: "sysadmin",
    label: "System Admin",
    description: "Users, devices, gates & configuration",
    icon: <Settings className="w-6 h-6" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "hover:border-amber-500/50",
    href: "/admin",
  },
  {
    role: "parent",
    label: "Parent",
    description: "Child status, timeline & approvals",
    icon: <Users className="w-6 h-6" />,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "hover:border-rose-500/50",
    href: "/parent",
  },
  {
    role: "student",
    label: "Student",
    description: "Digital ID, gate passes & history",
    icon: <GraduationCap className="w-6 h-6" />,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "hover:border-blue-500/50",
    href: "/student",
  },
];

export default function Home() {
  const router = useRouter();

  const handleSelect = (role: Role, href: string) => {
    sessionStorage.setItem("gate-monitor-role", role);
    router.push(href);
  };

  return (
    <main className="flex-1 flex items-center justify-center min-h-screen bg-[var(--bg-base)] p-6">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] mb-4">
            <Building2 className="w-8 h-8 text-[var(--action-primary)]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            JNTUH University College of Engineering
          </h1>
          <p className="text-[var(--text-secondary)] text-lg mb-1">
            Nachupally (Kondagattu), Jagtial Dist, Telangana — 505 501
          </p>
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-[var(--action-primary)]/10 border border-[var(--action-primary)]/30">
            <span className="w-2 h-2 rounded-full bg-[var(--action-primary)] animate-pulse" />
            <span className="text-sm font-medium text-[var(--action-primary)]">
              NAAC A+ Accredited · Gate Monitoring System
            </span>
          </div>
        </motion.div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLES.map((r, i) => (
            <motion.button
              key={r.role}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              onClick={() => handleSelect(r.role, r.href)}
              className={`group text-left p-6 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] ${r.border} transition-all duration-200 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5`}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${r.bg} ${r.color} mb-4`}>
                {r.icon}
              </div>
              <h3 className="text-lg font-semibold mb-1">{r.label}</h3>
              <p className="text-sm text-[var(--text-muted)]">{r.description}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-[var(--text-muted)] group-hover:text-[var(--action-primary)] transition-colors">
                Enter Portal
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-12">
          © 2026 JNTUH-UCoEJ · Digital Campus Management & Monitoring Platform · Module 2: Gate Monitoring
        </p>
      </div>
    </main>
  );
}