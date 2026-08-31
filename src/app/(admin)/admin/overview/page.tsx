"use client";

import { Shield, AlertTriangle, Clock, Info, ArrowRight, Activity, GraduationCap, UserCheck, Briefcase, HardHat, Zap, Database } from "lucide-react";
import Link from "next/link";

const iconMap: Record<string, any> = {
  Activity,
  Shield,
  AlertTriangle,
  Clock,
  Info,
  ArrowRight,
  GraduationCap,
  UserCheck,
  Briefcase,
  HardHat,
  Zap,
  Database,
};

export default function AdminOverviewPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
            <Shield className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed max-w-2xl">
              Central command for campus access control. Monitor real-time gate telemetry, track student/faculty/staff/worker movement,
              manage security alerts, and enforce lockdown protocols across all entry points.
            </p>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { href: "/admin", icon: "Activity", label: "Live Dashboard", desc: "Real-time campus status & gate telemetry" },
            { href: "/admin/gates", icon: "Shield", label: "Gate Management", desc: "Hardware status, operators & scan logs" },
            { href: "/admin/students", icon: "GraduationCap", label: "Student Roster", desc: "Master student directory & ID management" },
            { href: "/admin/faculty", icon: "UserCheck", label: "Faculty Tracking", desc: "Attendance & movement for teaching staff" },
            { href: "/admin/staff", icon: "Briefcase", label: "Staff Oversight", desc: "Staff check-in/out tracking" },
            { href: "/admin/workers", icon: "HardHat", label: "Worker Shifts", desc: "Contractor shift & attendance tracking" },
            { href: "/admin/alerts", icon: "AlertTriangle", label: "Alert Center", desc: "Security alerts & incident management" },
            { href: "/admin/occupancy", icon: "Zap", label: "Spatial Density", desc: "Zone capacity & digital twin monitoring" },
            { href: "/admin/reports", icon: "Database", label: "Reports & Analytics", desc: "Historical data & exportable reports" },
          ].map((mod, i) => {
            const IconComp = iconMap[mod.icon];
            return (
              <Link
                key={i}
                href={mod.href}
                className="group p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                      {IconComp && <IconComp className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">
                        {mod.label}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{mod.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Info Strip */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-400">Command Overview</p>
          <p className="text-[11px] text-amber-300/70 mt-0.5">
            All modules pull from the same live telemetry feed. The Dashboard page shows real-time status; drill into individual modules for deeper management.
          </p>
        </div>
      </div>
    </div>
  );
}
