"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuthStore } from "@/stores/authStore";
import { useDashboardData } from "@/hooks/useDashboardData";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { cn } from "@/lib/utils";
import { AlertsContent, type AlertsSseState } from "@/components/sysadmin/domains/alerts/AlertsContent";
import type { AlertsData } from "@/components/sysadmin/domains/alerts/types";

function useAlertsStream(
  active: boolean,
  onLive: () => void
): { sseState: AlertsSseState; liveAt: string | null } {
  const [sseState, setSseState] = useState<AlertsSseState>("idle");
  const [liveAt, setLiveAt] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!active) return;

    sourceRef.current?.close();
    const source = new EventSource("/api/admin/alerts/stream", { withCredentials: true });
    sourceRef.current = source;
    setSseState("connecting");

    source.onopen = () => setSseState("polling");

    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as { type?: string; timestamp?: string };
        if (parsed?.type === "alerts" && parsed.timestamp) {
          setSseState("live");
          setLiveAt(parsed.timestamp);
          onLive();
        }
      } catch {
        // Ignore malformed frames and keep the polling fallback active.
      }
    };

    source.onerror = () => {
      setSseState("polling");
    };

    const fallback = window.setTimeout(() => {
      setSseState((current) => (current === "idle" ? "polling" : current));
    }, 15_000);

    return () => {
      window.clearTimeout(fallback);
      source.close();
      sourceRef.current = null;
    };
  }, [active, onLive]);

  return { sseState, liveAt };
}

function AlertsInner() {
  const user = useAuthStore((s) => s.user);
  const { data, loading, error, refresh } = useDashboardData<AlertsData>(
    "/api/admin/alerts/overview",
    {
      ttlMs: 30_000,
      pollMs: 10_000,
    }
  );

  const onLive = useCallback(() => {
    void refresh();
  }, [refresh]);

  const { sseState, liveAt } = useAlertsStream(Boolean(user?.id), onLive);
  const busy = loading && !data;

  return (
    <div className="space-y-4 min-w-0">
      <PageHeader
        title="Alerts"
        subtitle="Live feed, rule heat, and severity KPIs for the alerts domain"
        onRefresh={refresh}
        refreshing={loading && data != null}
        actions={
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                sseState === "live"
                  ? "text-emerald-600 bg-emerald-50 border border-emerald-200"
                  : sseState === "polling"
                    ? "text-amber-600 bg-amber-50 border border-amber-200"
                    : "text-slate-500 bg-slate-50 border border-slate-200"
              )}
            >
              {sseState === "live" ? "SSE live" : sseState === "polling" ? "SSE polling" : "SSE idle"}
            </span>
            {liveAt && (
              <span className="text-[11px] text-[var(--text-muted)]">
                last event {new Date(liveAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        }
      />

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
          Alerts unavailable: {error}
        </div>
      )}

      <WidgetBoundary title="Alerts">
        {busy ? (
          <div className="grid gap-3">
            <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-48 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        ) : (
          data && <AlertsContent data={data} sseState={sseState} />
        )}
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
