"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/lib/types";
import type { Alert } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";
import Link from "next/link";
import { Clock, Loader2, AlertTriangle, Bell, ArrowUpRight, ShieldAlert } from "lucide-react";

interface AlertsData {
  success: boolean;
  data: Alert[];
}

const SEV_STYLES: Record<string, string> = {
  critical: "bg-rose-500/20 text-rose-400",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-sky-500/20 text-sky-400",
};

function AlertsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "sysadmin") as Role;

  const { data, loading, error, refresh } = useApiResource<AlertsData>(
    "/api/alerts?resolved=false",
    { ttlMs: 30_000 }
  );

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = loading && !data;
  const alerts: Alert[] = (data as AlertsData | null)?.data ?? [];
  const criticals = alerts.filter((a) => a.severity === "critical").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 min-w-0">
      <div>
        <p className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Bell className="w-6 h-6 text-amber-400" />
          Monitoring &amp; Alerts
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Unresolved alerts visible to your tier. Alert rule configuration lives under
          Alert Rules; technical audit trails live under Audit Logs.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Signed in as <span className="font-mono text-slate-300">{role}</span>
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/sysadmin/alerts/rules"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Manage Rules <ArrowUpRight className="w-3 h-3" />
          </Link>
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
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Alerts unavailable: {error}
        </div>
      )}

      <WidgetBoundary title="Monitoring & Alerts">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-0">
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
            <p className="text-xs text-slate-500 uppercase">Open Alerts</p>
            <p className="mt-1 text-2xl font-bold text-white">{busy ? "…" : alerts.length}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
            <p className="text-xs text-slate-500 uppercase">Critical</p>
            <p className={`mt-1 text-2xl font-bold ${criticals > 0 ? "text-rose-400" : "text-slate-300"}`}>
              {busy ? "…" : criticals}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
            <p className="text-xs text-slate-500 uppercase">Scope</p>
            <p className="mt-1 text-sm font-semibold text-sky-400 flex items-center gap-1">
              <ShieldAlert className="w-4 h-4" /> tier-gated to {role}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 text-sm font-semibold text-white">
            Unresolved Alerts
          </div>
          {busy ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-800/40" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">No unresolved alerts for your tier.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60 min-w-0">
              {alerts.slice(0, 25).map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 min-w-0">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${SEV_STYLES[a.severity] ?? "bg-slate-700/40 text-slate-400"}`}>
                    {a.severity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-200 truncate">{a.title}</p>
                    <p className="text-xs text-slate-500 truncate">{a.message}</p>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">
                    {new Date(a.timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
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

export default function SysadminAlertsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <Suspense fallback={<PageLoading />}>
        <AlertsInner />
      </Suspense>
    </AuthGuard>
  );
}
