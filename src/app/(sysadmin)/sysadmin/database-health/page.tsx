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
import { Database, Clock, Loader2, AlertTriangle } from "lucide-react";

interface DbHealthData {
  status: string;
  latencyMs: number | null;
  databaseSize: string | null;
  connections: { total: number; active: number } | null;
  longestQuery: number | null;
  cacheHitRatio: number | null;
}

function DatabaseHealthInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "sysadmin") as Role;

  const { data, loading, error, refresh } = useApiResource<
    { success: boolean; data: DbHealthData }
  >("/api/sysadmin/database-health", { ttlMs: 30_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const d = (data as { success: boolean; data: DbHealthData } | null)?.data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 min-w-0">
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Database className="w-6 h-6 text-sky-400" />
          Database Health
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          PostgreSQL connectivity, sizing, connections, cache efficiency and query depth.
          Backup &amp; retention policies live under Backup Status and Data Governance.
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
          Database health data unavailable: {error}
        </div>
      )}

      <WidgetBoundary title="Database Health">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
          {busy ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-800/40" />
            ))
          ) : (
            <>
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
                <p className="text-xs text-slate-500 uppercase">Connectivity</p>
                <p className={`mt-1 text-xl font-bold ${d?.status === "healthy" ? "text-emerald-400" : "text-rose-400"}`}>
                  {d?.status ?? "unknown"}
                </p>
                <p className="text-xs text-slate-500">
                  {d?.latencyMs != null ? `${d.latencyMs} ms round-trip` : "latency unavailable"}
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
                <p className="text-xs text-slate-500 uppercase">Database Size</p>
                <p className="mt-1 text-xl font-bold text-sky-400">{d?.databaseSize ?? "N/A"}</p>
                <p className="text-xs text-slate-500">pg_database_size(current)</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
                <p className="text-xs text-slate-500 uppercase">Connections</p>
                <p className="mt-1 text-xl font-bold text-white">
                  {d?.connections ? `${d.connections.active} / ${d.connections.total}` : "N/A"}
                </p>
                <p className="text-xs text-slate-500">active / total sessions</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
                <p className="text-xs text-slate-500 uppercase">Longest Query</p>
                <p className="mt-1 text-xl font-bold text-amber-400">
                  {d?.longestQuery != null ? `${d.longestQuery}s` : "idle"}
                </p>
                <p className="text-xs text-slate-500">active query running time</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
                <p className="text-xs text-slate-500 uppercase">Cache Hit Ratio</p>
                <p className="mt-1 text-xl font-bold text-emerald-400">
                  {d?.cacheHitRatio != null ? `${d.cacheHitRatio}%` : "N/A"}
                </p>
                <p className="text-xs text-slate-500">shared buffers hit / read</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
                <p className="text-xs text-slate-500 uppercase">Data &amp; Backups</p>
                <p className="mt-1 text-xl font-bold text-slate-300">Governed</p>
                <p className="text-xs text-slate-500">See Backup Status for dump freshness</p>
              </div>
            </>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function DatabaseHealthPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <Suspense fallback={<PageLoading />}>
        <DatabaseHealthInner />
      </Suspense>
    </AuthGuard>
  );
}
