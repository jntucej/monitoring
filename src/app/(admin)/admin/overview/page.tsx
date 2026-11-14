"use client";

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
import Link from "next/link";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { QuickActions } from "@/components/admin/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { LiveEventsPanel } from "@/components/shared/LiveEventsPanel";

import { getAuthHeaders } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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

interface AuditEvent {
  id: string;
  action: string;
  userName?: string;
  userRole?: string;
  timestamp?: string;
}

interface OverviewData {
  command: { health: string[] };
  identity: { active: number; suspended: number; deprovisioned: number };
  access: { mfaCoverage: number };
  gates: { status: string[] };
  alerts: { critical: number; high: number; medium: number; low: number };
  counts: Record<string, number>;
  recentAuditEvents?: AuditEvent[];
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
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
      <PageHeader title="Admin" subtitle="Campus administration" onRefresh={load} />
      {/* Hero */}
      <div className="surface-card bg-bg-surface p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="surface-card p-3 bg-emerald-500/10 shrink-0">
            <Shield className="size-5 text-action-success" />
          </div>
          <div className="flex-1">
            <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-2xl">
              Central command for campus access control. Monitor real-time gate telemetry, track
              student/faculty/staff/worker movement, manage security alerts, and enforce lockdown
              protocols across all entry points.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Key Admin Functions */}
      <WidgetBoundary name="LiveOverview" title="Operational Metrics">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">
            Operational Metrics
          </h2>
          {error ? (
            <div className="surface-card bg-rose-500/5 p-4 text-sm text-action-danger">
              {error}
            </div>
          ) : !data ? (
            <div className="surface-card bg-bg-surface p-6 text-sm text-text-muted">
              Loading overview…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.label}
                    href={card.href}
                    aria-label={`${card.label}: ${fmt(card.value)}`}
                    className="surface-card group bg-bg-surface p-4 hover: hover:bg-emerald-500/5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="surface-card p-2 bg-emerald-500/10 text-action-success">
                        <Icon className="w-4 h-4" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-action-success group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="mt-3 text-2xl font-black text-text-primary">{fmt(card.value)}</p>
                    <p className="text-xs text-text-muted mt-0.5">{card.label}</p>
                  </Link>
                );
              })}
            </div>
          )}

          {data?.recentAuditEvents && data.recentAuditEvents.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Recent Campus Events
              </h3>
              <div className="rounded-xl border border-border bg-bg-surface divide-y divide-border">
                {data.recentAuditEvents.map((e) => (
                  <div key={e.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-4">
                      <code className="surface-card text-xs bg-bg-elevated px-1.5 py-1.5 text-action-success">
                        {e.action}
                      </code>
                      <p className="text-xs text-text-muted mt-1 truncate">
                        {e.userName || e.userRole || "system"}
                      </p>
                    </div>
                    <span className="text-xs text-text-muted whitespace-nowrap shrink-0">
                      {e.timestamp ? new Date(e.timestamp).toLocaleString("en-IN") : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <WidgetBoundary name="PersonalizedCampusHome" title="Personalized Campus Home">
        <PersonalizedCampusHome />
      </WidgetBoundary>
      <WidgetBoundary name="TaskContinuity" title="Task Continuity">
        <TaskContinuity />
      </WidgetBoundary>
      <WidgetBoundary name="UnifiedCampusCalendar" title="Unified Campus Calendar">
        <UnifiedCampusCalendar />
      </WidgetBoundary>

      {/* Module Cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-4">Modules</h2>
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
                aria-label={mod.label}
                className="surface-card group p-4 bg-bg-surface hover: hover:bg-emerald-500/5 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="surface-card p-2 bg-emerald-500/10 text-action-success group-hover:scale-110 transition-transform">
                      {IconComp && <IconComp className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-text-primary group-hover:text-action-success transition-colors">
                        {mod.label}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">{mod.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-action-success group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <WidgetBoundary name="QuickActions" title="Quick Actions">
        <QuickActions />
      </WidgetBoundary>
      <WidgetBoundary name="NotificationCenter" title="Notification Center">
        <NotificationCenter />
      </WidgetBoundary>
      <WidgetBoundary name="LiveEvents" title="Live Events">
        <LiveEventsPanel />
      </WidgetBoundary>

      {/* Info Strip */}
      <div className="surface-card bg-amber-500/5 p-4 flex items-center gap-3">
        <Info className="w-5 h-5 text-action-warning shrink-0" />
        <div>
          <p className="text-xs font-semibold text-action-warning">Command Overview</p>
          <p className="text-xs text-amber-300/70 mt-0.5">
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
