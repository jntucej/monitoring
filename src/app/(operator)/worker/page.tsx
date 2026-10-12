"use client";

import { Suspense, useCallback } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { ConditionalAlert } from "@/components/shared/ConditionalAlert";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import {
  AlertTriangle,
  Clock,
  Loader2,
  ShieldCheck,
  Users,
  Gauge,
  Flag,
} from "lucide-react";

const MIN_TIER = 40; // worker tier
const ALERTS_URL = "/api/admin/security/stats";

/*
 * NOTE: /api/workers/shifts is intentionally NOT fetched here — its allowlist is
 * admin/sysadmin only, so a worker account gets a 403. It is listed in the
 * "API role additions needed" report. If that lands later, add the shifts block
 * and re-enable the shift KPIs.
 */

/* ── response shapes ── */

interface SecurityStats {
  failedLogins24h: number;
  activeSessions: number;
  forced2FA: boolean;
  ipAllowlistEnabled: boolean;
  allowedIps: string[];
}

interface SecurityStatsResponse {
  success: boolean;
  data: SecurityStats;
}

/* ── building blocks ── */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-white",
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  loading?: boolean;
}) {
  return (
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

  const {
    data: securityStats,
    loading,
    error,
    refresh: refreshStats,
  } = useApiResource<SecurityStatsResponse>(ALERTS_URL, { ttlMs: 30_000 });

  const refresh = useCallback(async () => {
    clearCache();
    await refreshStats();
  }, [refreshStats]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const stats: SecurityStats = securityStats?.data ?? {
    failedLogins24h: 0,
    activeSessions: 0,
    forced2FA: false,
    ipAllowlistEnabled: false,
    allowedIps: [],
  };
  const anomalies = stats.failedLogins24h ?? 0;
  const activeSessions = stats.activeSessions ?? 0;
  const twoFAEnforced = stats.forced2FA ? 1 : 0;
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Gauge className="w-6 h-6 text-emerald-400" />
            Worker Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <ErrorBanner
          message={`Security stats loading failed: ${error}`}
          onRetry={() => void refreshStats()}
        />
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ShieldCheck}
          label="Failed Logins 24h"
          value={anomalies}
          sub="Failed login attempts flagged by security"
          accent="text-sky-400"
          loading={loading && !securityStats}
        />
        <StatCard
          icon={Flag}
          label="Active Sessions"
          value={activeSessions}
          sub="Live unrevoked sessions on the system"
          accent="text-amber-400"
          loading={loading && !securityStats}
        />
        <StatCard
          icon={Users}
          label="2FA Enforced"
          value={twoFAEnforced ? "On" : "Off"}
          sub={twoFAEnforced ? "MFA required for privileged roles" : "MFA optional system-wide"}
          accent="text-rose-400"
          loading={loading && !securityStats}
        />
        <StatCard
          icon={Gauge}
          label="Your Shift"
          value={user?.gateId ? "On Duty" : "Unassigned"}
          sub={user?.gateId ? "Assigned gate / area for today's shift" : "No gate assignment on record"}
          accent="text-emerald-400"
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
          {loading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading alerts…
            </div>
          ) : (
            <div className="p-4">
              <ConditionalAlert
                ctx={{
                  role,
                  userId: user?.id ?? "unknown",
                  gateId: user?.gateId ?? null,
                  departmentId: user?.departmentId ?? null,
                  assignedHostel: user?.assignedHostel ?? null,
                  metrics: { failedLogins24h: stats.failedLogins24h, activeSessions: stats.activeSessions },
                }}
                limit={5}
              />
              {!loading && !securityStats?.data && (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-6 text-center text-sm text-slate-500">
                  No active alerts for your shift.
                </div>
              )}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function WorkerDashboardPage() {
  return (
    <GuardedPage minTier={MIN_TIER} allowedRoles={["worker", "operator", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <WorkerDashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
