"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import { usePolling } from "@/hooks/usePolling";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import type { Alert, Role } from "@/lib/types";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { ApprovalInbox } from "@/components/shared/ApprovalInbox";
import { LiveActivityFeed } from "@/components/shared/LiveActivityFeed";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { ContributionPortfolio } from "@/components/retention/ContributionPortfolio";
import { DigitalHandover } from "@/components/retention/DigitalHandover";
import { CampusFeedbackDesk } from "@/components/retention/CampusFeedbackDesk";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import Link from "next/link";
import { ArrowRight, Loader2, Clock, AlertTriangle, ShieldCheck, Lock, Users } from "lucide-react";

/* ── response shapes ── */

interface PresenceMatrixResponse {
  success: boolean;
  data: {
    gates: Array<{ id: string; name: string; code: string; audience: string; type: string }>;
    roles: string[];
    matrix: Record<string, Record<string, number>>;
    lastUpdated: string;
  };
}

interface LockdownResponse {
  success: boolean;
  data: { id?: string; reason?: string; startedAt?: string; started_at?: string } | null;
}

interface StaffAttendanceResponse {
  success: boolean;
  summary?: {
    totalStaff: number;
    presentToday: number;
    overallAttendanceRate?: number;
  };
}

/* ── main content ── */

function SupervisorOverviewInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "supervisor") as Role;
  const tier = getRoleTier(role);

  const {
    data: lockdown,
    loading: lockdownLoading,
    refresh: refreshLockdown,
  } = useApiResource<LockdownResponse>("/api/lockdown/active", { ttlMs: 30_000 });

  const {
    data: presence,
    loading: presenceLoading,
    refresh: refreshPresence,
  } = useApiResource<PresenceMatrixResponse>("/api/occupancy/presence-matrix", {
    ttlMs: 30_000,
  });

  const {
    data: alertsRes,
    loading: alertsLoading,
    refresh: refreshAlerts,
  } = useApiResource<{ success: boolean; data: Alert[] }>("/api/alerts?limit=5", {
    ttlMs: 30_000,
  });

  const {
    data: staff,
    loading: staffLoading,
    refresh: refreshStaff,
  } = useApiResource<StaffAttendanceResponse>("/api/staff/attendance", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshLockdown(),
      refreshPresence(),
      refreshAlerts(),
      refreshStaff(),
    ]);
  }, [refreshLockdown, refreshPresence, refreshAlerts, refreshStaff]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const matrix = presence?.data?.matrix ?? {};
  const gates = presence?.data?.gates ?? [];
  const onCampusTotal = gates.reduce(
    (sum, g) => sum + Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0),
    0
  );
  const lockdownActive = Boolean(lockdown?.data);
  const alerts = alertsRes?.data ?? [];
  const summary = staff?.summary;
  const anyLoading = lockdownLoading || presenceLoading || alertsLoading || staffLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-[var(--text-muted)] min-w-0">
            Signed in as <span className="font-mono text-[var(--text-secondary)]">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button type="button"
                    onClick={() => void refreshAll()}
          disabled={anyLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-primary)] hover:opacity-90 disabled:opacity-50 shrink-0"
        >
          {anyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
          {anyLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* KPI row */}
      <WidgetBoundary title="Security Overview">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2 text-slate-400 min-w-0">
              <Lock className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide truncate">Lockdown</span>
            </div>
            {lockdownLoading && !lockdown ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            ) : (
              <p className={`text-2xl font-bold ${lockdownActive ? "text-rose-400" : "text-emerald-400"}`}>
                {lockdownActive ? "Active" : "None"}
              </p>
            )}
            <p className="text-xs text-slate-500 min-w-0">
              {lockdownActive ? (lockdown?.data?.reason ?? "Raised") : "No active lockdown"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2 text-slate-400 min-w-0">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide truncate">On Campus</span>
            </div>
            {presenceLoading && !presence ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            ) : (
              <p className="text-2xl font-bold text-sky-400">{onCampusTotal}</p>
            )}
            <p className="text-xs text-slate-500 min-w-0">
              {gates.length ? `${gates.length} gates` : "…"} in live presence matrix
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2 text-slate-400 min-w-0">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide truncate">Active Alerts</span>
            </div>
            {alertsLoading && !alertsRes ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            ) : (
              <p className={`text-2xl font-bold ${alerts.length > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                {alerts.length}
              </p>
            )}
            <p className="text-xs text-slate-500 min-w-0">Incidents currently unacknowledged</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2 text-slate-400 min-w-0">
              <Users className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wide truncate">Staff Present</span>
            </div>
            {staffLoading && !staff ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            ) : (
              <p className="text-2xl font-bold text-amber-400">
                {summary?.presentToday ?? 0} / {summary ? (summary.totalStaff ?? 0) - (summary.presentToday ?? 0) : "…"}
              </p>
            )}
            <p className="text-xs text-slate-500 min-w-0">
              Today&apos;s staff check-ins ({summary?.overallAttendanceRate ?? "…"}% attendance rate)
            </p>
          </div>
        </div>
      </WidgetBoundary>

      {/* Quick links to section pages */}
      <WidgetBoundary title="Desk Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          {[
            { href: "/supervisor/gates", label: "Gate Status", sub: "Live presence by gate" },
            { href: "/supervisor/gate-activity", label: "Gate Activity", sub: "Per-gate live counts" },
            { href: "/supervisor/shifts", label: "Operator & Shifts", sub: "Guard & staff attendance" },
            { href: "/supervisor/exceptions", label: "Exceptions", sub: "Pending staff leave & outpass" },
            { href: "/supervisor/incidents", label: "Incidents", sub: "Assign & acknowledge alerts" },
            { href: "/supervisor/handover", label: "Handover", sub: "Shift handover log" },
            { href: "/supervisor/escalation-centre", label: "Escalation Centre", sub: "Escalated requests & routing" },
            { href: "/supervisor/reports", label: "Reports", sub: "Security report exports" },
            { href: "/supervisor/approvals", label: "Approvals", sub: "Outpass decision desk" },
          ].map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-xl border border-slate-800 bg-[#111827] p-3 flex items-center justify-between gap-2 hover:border-slate-600 transition-colors min-w-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{s.label}</p>
                <p className="text-xs text-slate-500 min-w-0">{s.sub}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
            </Link>
          ))}
        </div>
      </WidgetBoundary>

      {/* Shared action & notification surfaces */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 min-w-0">
        <QuickActions />
        <NotificationCenter />
      </div>

      {/* Approval & live activity (shift-based ops) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 min-w-0">
        <ApprovalInbox />
        <LiveActivityFeed />
      </div>

      {/* Personalized campus home (retention) */}
      <PersonalizedCampusHome />

      {/* Task continuity + contribution portfolio */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 min-w-0">
        <TaskContinuity />
        <ContributionPortfolio />
      </div>

      {/* Digital handover + feedback desk */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 min-w-0">
        <DigitalHandover />
        <CampusFeedbackDesk />
      </div>

      {/* Unified campus calendar */}
      <UnifiedCampusCalendar />

      <DevContactStrip />
    </div>
  );
}

export default function SupervisorOverviewPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SupervisorOverviewInner />
    </Suspense>
  );
}
