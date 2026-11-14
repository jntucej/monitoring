"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { AlertTriangle, Boxes } from "lucide-react";

interface RedisWorkerData {
  redis: { status: string } | null;
  redisDetails: {
    connectedClients: number | null;
    usedMemoryBytes: number | null;
    opsPerSecond: number | null;
  } | null;
  worker: { status: string } | null;
  error?: string;
}

function formatBytes(n: number | null): string {
  if (n == null) return "N/A";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusPill({ status }: { status?: string | null }) {
  const s = status ?? "unknown";
  const cls =
    s === "healthy"
      ? "bg-emerald-500/20 text-action-success"
      : s === "degraded"
        ? "bg-amber-500/20 text-action-warning"
        : s === "unhealthy"
          ? "bg-rose-500/20 text-action-danger"
          : "bg-bg-elevated/40 text-text-muted";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{s}</span>;
}

function RedisWorkerInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "sysadmin") as Role;

  const { data, loading, error, refresh } = useApiResource<
    { success: boolean; data: RedisWorkerData }
  >("/api/sysadmin/redis-worker", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const d = (data as { success: boolean; data: RedisWorkerData } | null)?.data;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-4 sm:py-6 min-w-0">
      <div>
        <p className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Boxes className="w-6 h-6 text-action-info" />
          Redis &amp; Worker Health
        </p>
        <p className="text-xs text-text-muted mt-1">
          Cache layer and background job runner status. Scheduled job details live under
          Deployment History.
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
          Service data unavailable: {error}
        </div>
      )}

      <WidgetBoundary title="Redis & Worker Health">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
          {/* Redis card */}
          <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Redis (cache layer)</span>
              <StatusPill status={d?.redis?.status} />
            </div>
            {busy ? (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-bg-elevated/40" />
                ))}
              </div>
            ) : d?.redisDetails ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 min-w-0">
                <div className="rounded-lg border border-border bg-bg-surface/40 p-3 min-w-0">
                  <p className="text-xs text-text-muted uppercase">Clients</p>
                  <p className="text-lg font-bold text-action-info">
                    {d.redisDetails.connectedClients != null ? d.redisDetails.connectedClients : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-bg-surface/40 p-3 min-w-0">
                  <p className="text-xs text-text-muted uppercase">Memory</p>
                  <p className="text-lg font-bold text-action-info">{formatBytes(d.redisDetails.usedMemoryBytes)}</p>
                </div>
                <div className="rounded-lg border border-border bg-bg-surface/40 p-3 min-w-0">
                  <p className="text-xs text-text-muted uppercase">Ops/sec</p>
                  <p className="text-lg font-bold text-action-info">
                    {d.redisDetails.opsPerSecond != null ? d.redisDetails.opsPerSecond : "—"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <p className="text-xs text-text-muted">
                  Redis liveness reports from the app health engine. Detailed Prometheus counters
                  are not available in this environment — client, memory and ops fields will
                  appear once the metrics exporter is reachable.
                </p>
              </div>
            )}
          </div>

          {/* Worker card */}
          <div className="rounded-xl border border-border bg-bg-base overflow-hidden min-w-0">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Background Worker</span>
              <StatusPill status={d?.worker?.status} />
            </div>
            <div className="p-4 space-y-3 min-w-0">
              {busy ? (
                <div className="h-12 animate-pulse rounded-lg bg-bg-elevated/40" />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-text-muted">Queue runner liveness</p>
                    <StatusPill status={d?.worker?.status} />
                  </div>
                  <p className="text-xs text-text-muted">
                    The worker runs background jobs (statistics aggregation, cleanup, audit
                    rotation). Job schedules and last-run details are listed under Deployment
                    History.
                  </p>
                  {d?.error && (
                    <p className="text-xs text-action-warning">Health engine note: {d.error}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </WidgetBoundary>

    </div>
  );
}

export default function RedisWorkerPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <Suspense fallback={<PageLoading />}>
        <RedisWorkerInner />
      </Suspense>
    </AuthGuard>
  );
}
