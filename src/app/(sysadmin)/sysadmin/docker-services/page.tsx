"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { DockerFleetPanel } from "@/components/sysadmin/monitoring/DockerFleetPanel";
import { AlertTriangle, Container } from "lucide-react";

interface ServicesData {
  status?: string;
  services?: Record<string, unknown>;
  redis?: { status: string };
  database?: { status: string; latencyMs: number };
  gateways?: { status: string; online: number; offline: number; total: number };
  containers: Array<{
    name: string;
    running: boolean;
    cpuPercent: number;
    memoryBytes: number;
    restartsLastHour: number;
  }> | null;
  containersError?: string | null;
  servicesError?: string;
}

function formatBytes(n: number): string {
  if (n <= 0) return "0";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function DockerServicesInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "sysadmin") as Role;

  const { data, loading, error, refresh } = useApiResource<
    { success: boolean; data: ServicesData }
  >("/api/sysadmin/services", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const d = (data as { success: boolean; data: ServicesData } | null)?.data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 min-w-0">
      <div>
        <p className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Container className="w-6 h-6 text-action-danger" />
          Docker &amp; Service Status
        </p>
        <p className="text-xs text-text-muted mt-1">
          Container liveness and app-level service checks. Host-level Prometheus charts are in
          the fleet panel below.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          Signed in as <span className="font-mono text-text-secondary">{role}</span>
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-action-warning">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Service status unavailable: {error}
        </div>
      )}

      {/* App-level service + container summary */}
      <WidgetBoundary title="Services & Containers">
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Service &amp; Container Status</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                d?.status === "healthy"
                  ? "bg-emerald-500/20 text-action-success"
                  : d?.status === "degraded"
                    ? "bg-amber-500/20 text-action-warning"
                    : "bg-bg-elevated/40 text-text-muted"
              }`}
            >
              {d?.status ?? "loading"}
            </span>
          </div>

          {busy ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-elevated/40" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60 min-w-0">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-secondary">PostgreSQL</p>
                  <p className="text-xs text-text-muted">
                    {d?.database ? `latency ${d.database.latencyMs} ms` : "latency n/a"}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    d?.database?.status === "healthy"
                      ? "bg-emerald-500/20 text-action-success"
                      : "bg-rose-500/20 text-action-danger"
                  }`}
                >
                  {d?.database?.status ?? "unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Redis (cache)</p>
                  <p className="text-xs text-text-muted">shared cache layer</p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    d?.redis?.status === "healthy"
                      ? "bg-emerald-500/20 text-action-success"
                      : "bg-amber-500/20 text-action-warning"
                  }`}
                >
                  {d?.redis?.status ?? "unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Gateways (edge nodes)</p>
                  <p className="text-xs text-text-muted">
                    {d?.gateways
                      ? `${d.gateways.online} online / ${d.gateways.offline} offline of ${d.gateways.total}`
                      : "no gateway data"}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    d?.gateways?.status === "healthy"
                      ? "bg-emerald-500/20 text-action-success"
                      : "bg-amber-500/20 text-action-warning"
                  }`}
                >
                  {d?.gateways?.status ?? "unknown"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Containers table */}
        <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Containers</span>
            <span className="text-xs text-text-muted">
              {d?.containers ? `${d.containers.length} tracked` : "not available"}
            </span>
          </div>
          {busy ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-elevated/40" />
              ))}
            </div>
          ) : !d?.containers ? (
            <div className="p-6 text-center min-w-0">
              <p className="text-sm text-text-muted">
                Container telemetry requires the host Prometheus/cAdvisor exporter.
              </p>
              <p className="text-xs text-text-muted max-w-md mx-auto mt-1">
                {d?.containersError
                  ? `Exporter unreachable: ${d.containersError}`
                  : "No container data in this environment."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left text-sm min-w140">
                <thead>
                  <tr className="border-b border-border text-xs text-text-muted uppercase">
                    <th className="px-4 py-2 font-medium">Container</th>
                    <th className="px-3 py-2 font-medium">State</th>
                    <th className="px-3 py-2 font-medium">CPU</th>
                    <th className="px-3 py-2 font-medium">Memory</th>
                    <th className="px-3 py-2 font-medium">Restarts (1h)</th>
                  </tr>
                </thead>
                <tbody>
                  {d.containers.map((c) => (
                    <tr key={c.name} className="border-b border-border/50">
                      <td className="px-4 py-2 font-mono text-xs text-text-secondary">{c.name}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            c.running
                              ? "bg-emerald-500/20 text-action-success"
                              : "bg-rose-500/20 text-action-danger"
                          }`}
                        >
                          {c.running ? "running" : "stopped"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-text-secondary">{c.cpuPercent}%</td>
                      <td className="px-3 py-2 text-text-secondary">{formatBytes(c.memoryBytes)}</td>
                      <td className="px-3 py-2 text-text-secondary">
                        {c.restartsLastHour > 0 ? (
                          <span className="text-action-warning">{c.restartsLastHour}</span>
                        ) : (
                          "0"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* Host-level Prometheus fleet charts (existing panel) */}
      <DockerFleetPanel />

    </div>
  );
}

export default function DockerServicesPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <Suspense fallback={<PageLoading />}>
        <DockerServicesInner />
      </Suspense>
    </AuthGuard>
  );
}
