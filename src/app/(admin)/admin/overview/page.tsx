"use client";

<<<<<<< HEAD
export const dynamic = "force-dynamic";

import { Shield, AlertTriangle, Clock, Info, ArrowRight, Activity, GraduationCap, UserCheck, Briefcase, HardHat, Zap, Database } from "lucide-react";
=======
import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  AlertTriangle,
  Info,
  ArrowRight,
  Activity,
  GraduationCap,
  UserCheck,
  Briefcase,
  HardHat,
  Zap,
  Database,
  Users,
  Ticket,
  Clock,
} from "lucide-react";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
import Link from "next/link";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { getAuthHeaders } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";

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

interface OverviewData {
  command: { health: string[] };
  identity: { active: number; suspended: number; deprovisioned: number };
  access: { mfaCoverage: number };
  gates: { status: string[] };
  alerts: { critical: number; high: number; medium: number; low: number };
  counts: Record<string, number>;
}

function fmt(n: number | string | null | undefined): string {
  if (typeof n === "string") return n;
  return (typeof n === "number" && !Number.isNaN(n) ? n : 0).toLocaleString("en-IN");
}

function AdminOverviewInner() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview", { headers: getAuthHeaders(), cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setError(null);
      } else {
        setError(typeof json.error === "string" ? json.error : json.error?.message ?? "Failed to load overview");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll the overview every 30 s so the KPI tiles and module cards stay fresh.
  usePolling(load, { intervalMs: 30_000 });

  const activeGates = (data?.gates.status ?? []).filter((s) => s === "online").length;
  const totalGates = data?.gates.status.length ?? 0;
  const openAlerts = data
    ? (data.alerts?.critical ?? 0) + (data.alerts?.high ?? 0) + (data.alerts?.medium ?? 0) + (data.alerts?.low ?? 0)
    : 0;
  const statCards = data
    ? [
        { icon: Users, label: "Active Users", value: data.identity?.active ?? 0, href: "/admin/users" },
        { icon: Shield, label: "Gates Online", value: `${activeGates}/${totalGates}`, href: "/admin/gates" },
        { icon: AlertTriangle, label: "Open Alerts", value: openAlerts, href: "/admin/alerts" },
        { icon: Ticket, label: "Pending Approvals", value: data.counts?.access ?? 0, href: "/admin/passes" },
        { icon: Zap, label: "Suspended Users", value: data.identity?.suspended ?? 0, href: "/admin/users" },
      ]
    : [];

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
              Central command for campus access control. Monitor real-time gate telemetry, track
              student/faculty/staff/worker movement, manage security alerts, and enforce lockdown
              protocols across all entry points.
            </p>
          </div>
        </div>
      </div>

      {/* Live Overview */}
      <WidgetBoundary title="Overview">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">
            Live Overview
          </h2>
          {error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-300">
              {error}
            </div>
          ) : !data ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]">
              Loading overview…
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.label}
                    href={card.href}
                    className="group rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="mt-3 text-2xl font-black text-[var(--text-primary)]">{fmt(card.value)}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{card.label}</p>
                  </Link>
                );
              })}
            </div>
          )}

          {typeof data === "object" && data != null && "recentAuditEvents" in data &&
            Array.isArray((data as any).recentAuditEvents) &&
            (data as any).recentAuditEvents.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Recent Campus Events
              </h3>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] divide-y divide-[var(--border)]">
                {(data as any).recentAuditEvents.map((e: any) => (
                  <div key={e.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <code className="text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-1.5 py-1.5 text-emerald-400">
                        {e.action}
                      </code>
                      <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                        {e.userName || e.userRole || "system"}
                      </p>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap shrink-0">
                      {e.timestamp ? new Date(e.timestamp).toLocaleString("en-IN") : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>

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
            All modules pull from the same live telemetry feed. The Dashboard page shows real-time
            status; drill into individual modules for deeper management.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    
      <AdminOverviewInner />
    
    

  );
}
