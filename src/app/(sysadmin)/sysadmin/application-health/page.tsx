"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { Activity, AlertTriangle } from "lucide-react";

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
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-4 sm:py-6 min-w-0">
      <div>
        <p className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Activity className="w-6 h-6 text-action-danger" />
          Application Health
        </p>
        <p className="text-xs text-text-muted mt-1">
          App-level process health, request metrics and service checks. Host &amp; container
          telemetry lives under Docker and Service Status.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          Signed in as <span className="font-mono text-text-secondary">{role}</span>
        </p>
      </div>

      {error && (
        <div className="surface-card bg-amber-500/10 p-3 text-sm text-action-warning">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Application health data unavailable: {error}
        </div>
      )}

      <WidgetBoundary title="Application Health">
        {!busy && !health ? (
          <div className="surface-card bg-bg-base p-8 text-center min-w-0">
            <p className="text-sm text-text-muted">No application health data available.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
            <div className="surface-card px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white">Process &amp; Request Metrics</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  health?.status === "healthy"
                    ? "bg-emerald-500/20 text-action-success"
                    : health?.status === "degraded"
                      ? "bg-amber-500/20 text-action-warning"
                      : "bg-rose-500/20 text-action-danger"
                }`}
              >
                {health?.status ?? "loading"}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4 min-w-0">
              {busy ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-bg-elevated/40" />
                ))
              ) : (
                <>
                  <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                    <p className="text-xs text-text-muted uppercase">Uptime</p>
                    <p className="text-lg font-bold text-action-info">{formatUptime(safeHealth.uptimeSeconds)}</p>
                  </div>
                  <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                    <p className="text-xs text-text-muted uppercase">Active Users</p>
                    <p className="text-lg font-bold text-action-success">{safeHealth.metrics.activeUsers}</p>
                  </div>
                  <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                    <p className="text-xs text-text-muted uppercase">Active Sessions</p>
                    <p className="text-lg font-bold text-action-success">{safeHealth.metrics.activeSessions}</p>
                  </div>
                  <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                    <p className="text-xs text-text-muted uppercase">Req/min</p>
                    <p className="text-lg font-bold text-white">{safeHealth.metrics.requestsPerMinute}</p>
                  </div>
                  <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                    <p className="text-xs text-text-muted uppercase">Error Rate</p>
                    <p className={`text-lg font-bold ${safeHealth.metrics.errorRate > 5 ? "text-action-danger" : "text-action-success"}`}>
                      {safeHealth.metrics.errorRate}%
                    </p>
                  </div>
                  <div className="surface-card bg-bg-surface/40 p-3 min-w-0">
                    <p className="text-xs text-text-muted uppercase">Avg Response</p>
                    <p className="text-lg font-bold text-white">{safeHealth.metrics.avgResponseTime}ms</p>
                  </div>
                </>
              )}
            </div>
            {!busy && safeHealth.recentAlerts.length > 0 && (
              <div className="px-4 pb-4 min-w-0">
                <p className="text-xs font-semibold uppercase text-text-muted mb-2">Recent Alerts</p>
                <div className="space-y-2 min-w-0">
                  {safeHealth.recentAlerts.slice(0, 5).map((a) => (
                    <div key={a.id} className="surface-card bg-bg-surface/40 p-3 flex items-center justify-between gap-2">
                      <span className="text-sm text-text-secondary truncate">{a.message}</span>
                      <span
                        className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          a.severity === "critical"
                            ? "bg-rose-500/20 text-action-danger"
                            : a.severity === "warning"
                              ? "bg-amber-500/20 text-action-warning"
                              : "bg-bg-elevated/40 text-text-muted"
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
