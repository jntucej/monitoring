"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { getAuthHeaders } from "@/lib/utils";
import type { Alert } from "@/lib/types";
import { BellOff, Loader2, Inbox, AlertTriangle } from "lucide-react";

function SupervisorIncidentsInner() {
  const user = useAuthStore((s) => s.user);

  const {
    data: alertsRes,
    loading: alertsLoading,
    error: alertsError,
    refresh: refreshAlerts,
  } = useApiResource<{ success: boolean; data: Alert[] }>("/api/alerts?limit=20", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await refreshAlerts();
  }, [refreshAlerts]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const alerts = alertsRes?.data ?? [];

  const handleResolveAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: true }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6 min-w-0">
      <WidgetBoundary title="Incident Assignment">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          {alertsError ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-rose-400 min-w-0">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="truncate">Alert feed unavailable: {alertsError}</span>
                <button
                  type="button"
                  onClick={() => void refreshAll()}
                  className="rounded-lg border border-rose-500/40 px-3 py-1 text-xs font-semibold hover:bg-rose-500/20 shrink-0"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : alertsLoading && !alerts.length ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Checking active incidents…
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-6 text-center min-w-0">
              <Inbox className="w-5 h-5 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No active incidents — all clear. The incident feed is empty for your tier right now.
              </p>
            </div>
          ) : (
            <div className="space-y-2 min-w-0">
              {alerts.slice(0, 10).map((a) => (
                <div key={a.id} className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-rose-300 min-w-0 break-words">{a.title || "Incident"}</p>
                    <button
                      type="button"
                      onClick={() => void handleResolveAlert(a.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold shrink-0"
                    >
                      Acknowledge
                    </button>
                  </div>
                  <p className="text-slate-400 mt-1.5 break-words min-w-0">{a.message}</p>
                  {a.severity && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 border border-amber-500/30">
                      {a.severity}
                    </span>
                  )}
                </div>
              ))}
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-3 text-xs text-slate-500 min-w-0">
                Incident assignment and acknowledgement detail is not exposed at this tier. The
                incident log remains admin-scoped; acknowledge here or via the alerts desk.
              </div>
            </div>
          )}
        </div>
      </WidgetBoundary>
    </div>
  );
}

export default function SupervisorIncidentsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SupervisorIncidentsInner />
    </Suspense>
  );
}
