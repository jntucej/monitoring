"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { Clock, Loader2, Activity, AlertTriangle } from "lucide-react";

interface HealthData {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptimeSeconds: number;
  metrics: {
    activeUsers: number;
    activeSessions: number;
    requestsPerMinute: number;
    errorRate: number;
    avgResponseTime: number;
  };
  services: Record<string, unknown>;
  database: { status: string; latencyMs: number };
  gateways: { status: string; online: number; offline: number; total: number };
  recentAlerts: Array<{ id: string; severity: string; message: string; timestamp: string }>;
}

function formatUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function ApplicationHealthInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "sysadmin") as Role;

  const { data, loading, error, refresh } = useApiResource<
    { success: boolean; data: HealthData }
  >("/api/sysadmin/application-health", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const health: HealthData | undefined = (data as { success: boolean; data: HealthData } | null)?.data;
  const safeHealth = health ?? { status: "degraded", uptimeSeconds: 0, metrics: { activeUsers: 0, activeSessions: 0, requestsPerMinute: 0, errorRate: 0, avgResponseTime: 0 }, recentAlerts: [] };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 min-w-0">
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Activity className="w-6 h-6 text-rose-400" />
          Application Health
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          App-level process health, request metrics and service checks. Host &amp; container
          telemetry lives under Docker and Service Status.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Signed in as <span className="font-mono text-slate-300">{role}</span>
        </p>
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" /> : <Clock className="w-3.5 h-3.5" />}
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Application health data unavailable: {error}
        </div>
      )}

      <WidgetBoundary title="Application Health">
        {!busy && !health ? (
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-8 text-center min-w-0">
            <p className="text-sm text-slate-500">No application health data available.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
            <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white">Process &amp; Request Metrics</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  health?.status === "healthy"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : health?.status === "degraded"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {health?.status ?? "loading"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 min-w-0">
              {busy ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-800/40" />
                ))
              ) : (
                <>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase">Uptime</p>
                    <p className="text-lg font-bold text-sky-400">{formatUptime(safeHealth.uptimeSeconds)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase">Active Users</p>
                    <p className="text-lg font-bold text-emerald-400">{safeHealth.metrics.activeUsers}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase">Active Sessions</p>
                    <p className="text-lg font-bold text-emerald-400">{safeHealth.metrics.activeSessions}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase">Req/min</p>
                    <p className="text-lg font-bold text-white">{safeHealth.metrics.requestsPerMinute}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase">Error Rate</p>
                    <p className={`text-lg font-bold ${safeHealth.metrics.errorRate > 5 ? "text-rose-400" : "text-emerald-400"}`}>
                      {safeHealth.metrics.errorRate}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase">Avg Response</p>
                    <p className="text-lg font-bold text-white">{safeHealth.metrics.avgResponseTime}ms</p>
                  </div>
                </>
              )}
            </div>
            {!busy && safeHealth.recentAlerts.length > 0 && (
              <div className="px-4 pb-4 min-w-0">
                <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Recent Alerts</p>
                <div className="space-y-2 min-w-0">
                  {safeHealth.recentAlerts.slice(0, 5).map((a) => (
                    <div key={a.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-300 truncate">{a.message}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          a.severity === "critical"
                            ? "bg-rose-500/20 text-rose-400"
                            : a.severity === "warning"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-slate-700/40 text-slate-400"
                        }`}
                      >
                        {a.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function ApplicationHealthPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <Suspense fallback={<PageLoading />}>
        <ApplicationHealthInner />
      </Suspense>
    </AuthGuard>
  );
}
