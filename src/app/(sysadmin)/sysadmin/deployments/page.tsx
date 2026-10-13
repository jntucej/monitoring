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
import { Clock, Loader2, AlertTriangle, GitBranch, History } from "lucide-react";

interface DeploymentRow {
  timestamp: string | null;
  commit: string | null;
  status: "deploying" | "skipped" | "failed" | "git_error";
  detail: string;
}

interface DeploymentsData {
  source: "host-deploy-log" | "unavailable";
  deployments: DeploymentRow[];
}

const STATUS_STYLES: Record<DeploymentRow["status"], string> = {
  deploying: "bg-emerald-500/20 text-emerald-400",
  skipped: "bg-slate-700/40 text-slate-400",
  failed: "bg-rose-500/20 text-rose-400",
  git_error: "bg-amber-500/20 text-amber-400",
};

function DeploymentsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "sysadmin") as Role;

  const { data, loading, error, refresh } = useApiResource<
    { success: boolean; data: DeploymentsData }
  >("/api/sysadmin/deployments?limit=40", { ttlMs: 60_000 });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 60_000, enabled: !!user });

  const busy = loading && !data;
  const d = (data as { success: boolean; data: DeploymentsData } | null)?.data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 min-w-0">
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-emerald-400" />
          Deployment History
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Deployment events parsed from the host watchdog log. Scheduled job runs live under
          Scheduled Jobs in the More panel.
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
          Deployment history unavailable: {error}
        </div>
      )}

      <WidgetBoundary title="Deployment History">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" /> Recent Deployment Events
            </span>
            <span className="text-xs text-slate-500">
              source: {d?.source ?? "loading"}
            </span>
          </div>

          {busy ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-800/40" />
              ))}
            </div>
          ) : !d || d.deployments.length === 0 ? (
            <div className="p-8 text-center min-w-0">
              <History className="w-6 h-6 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No deployment records available in this environment.
              </p>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                Deployment events are read from the host watchdog log under /opt/monitoring.
                In a dev or CI container without that file the history will be empty — contact
                the operations contact in the strip below.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60 min-w-0">
              {d.deployments.map((row, i) => (
                <div key={`${row.timestamp}-${row.status}-${i}`} className="flex items-center gap-3 px-4 py-3 min-w-0">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[row.status]}`}>
                    {row.status}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-200 truncate">{row.detail}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {row.commit ? `commit ${row.commit} · ` : ""}
                      {row.timestamp ?? "unknown time"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function DeploymentsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <Suspense fallback={<PageLoading />}>
        <DeploymentsInner />
      </Suspense>
    </AuthGuard>
  );
}
