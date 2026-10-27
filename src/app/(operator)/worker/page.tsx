<<<<<<< HEAD
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useMemo } from "react";
import { ConditionalAlert } from "@/components/shared/ConditionalAlert";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
=======
import { Suspense } from "react";
import { HardHat } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";

export default function WorkerPage() {
  return (
<<<<<<< HEAD
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2">
      <span className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {message}
      </span>
      <button
        onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20"
      >
        Retry
      </button>
    </div>
  );
}

/* ── main content ── */

function WorkerDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "worker") as Role;
  const tier = getRoleTier(role);

  // Role-scoped alert metrics — no admin telemetry is fetched here.
  const metrics = useMemo<Record<string, number>>(() => ({
    overdue: 0,
    curfewexceeded: 0,
    capacitybreach: 0,
  }), []);

  const refresh = useCallback(async () => {
    // No server-side refresh needed — metrics are derived locally for the
    // conditional alert widget; keep the poller no-op-safe.
  }, []);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const onDuty = Boolean(user?.gateId);
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 min-w-0">
      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            <Gauge className="w-6 h-6 text-emerald-400" />
            Worker Dashboard
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-400">
          <Clock className="w-4 h-4" />
          Shifts sync from the assignment system
        </span>
      </div>

      {/* KPI row — worker's own data only */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={ShieldCheck}
          label="Status"
          value={onDuty ? "On Duty" : "Unassigned"}
          sub={onDuty ? "Assigned gate / area for today\'s shift" : "No gate assignment on record"}
          accent="text-emerald-400"
        />
        <StatCard
          icon={Flag}
          label="Open Shift Alerts"
          value={0}
          sub="Role-scoped alerts below, updated live"
          accent="text-amber-400"
        />
        <StatCard
          icon={Users}
          label="Your Role"
          value={role}
          sub="Worker desk — no admin telemetry on this page"
          accent="text-sky-400"
        />
      </div>

      {/* role-aware alerts */}
      <WidgetBoundary title="Shift Alerts">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Shift Alerts
            </h2>
          </div>
          <div className="p-4 min-w-0">
            <ConditionalAlert
              ctx={{
                role,
                userId: user?.id ?? "unknown",
                gateId: user?.gateId ?? null,
                departmentId: user?.departmentId ?? null,
                assignedHostel: user?.assignedHostel ?? null,
                metrics,
=======
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["worker"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <WidgetBoundary>
            <RoleDashboardPanel
              title="Worker dashboard"
              icon={HardHat}
              endpoint="/api/workers/my-work"
              mapKpis={(raw: any) => {
                const d = raw ?? {};
                const tasks = Array.isArray(d.tasks) ? d.tasks.length : 0;
                return [
                  { label: "Assigned tasks", value: tasks, tone: tasks > 0 ? "warn" as const : "ok" as const },
                  { label: "Completed (week)", value: d.completedLastWeek ?? 0, tone: "ok" as const },
                  { label: "On shift", value: d.todayShift?.checkIn ? "Yes" : "No" },
                ];
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
              }}
            />
          </WidgetBoundary>
          <WidgetBoundary><AttentionQueue /></WidgetBoundary>
          <WidgetBoundary><PersonalizedCampusHome /></WidgetBoundary>
          <WidgetBoundary><TaskContinuity /></WidgetBoundary>
          <WidgetBoundary><UnifiedCampusCalendar /></WidgetBoundary>
          <WidgetBoundary><ActivityTimeline /></WidgetBoundary>
          <WidgetBoundary><QuickActions /></WidgetBoundary>
          <WidgetBoundary><NotificationCenter /></WidgetBoundary>
        </div>
      </AuthGuard>
    </Suspense>
  );
}
