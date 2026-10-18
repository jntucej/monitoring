"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { PageLoading } from "@/components/admin/shared/LoadingStates";
import { HealthDashboard } from "@/components/admin/HealthDashboard";
import { getAuthHeaders } from "@/lib/utils";
import { usePolling } from "@/hooks/usePolling";
import { useGlass } from "@/context/GlassContext";

type ComponentStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

interface HealthSnapshot {
  status: ComponentStatus;
  components: {
    database: { status: ComponentStatus; latency?: number };
    redis?: { status: ComponentStatus; latency?: number };
    gateways: { status: ComponentStatus; online?: number; offline?: number; total?: number };
  };
}

const DOT: Record<ComponentStatus, string> = {
  healthy: "bg-emerald-400",
  degraded: "bg-amber-400",
  unhealthy: "bg-rose-400",
  unknown: "bg-slate-500",
};

function StatusDot({ status, label, detail }: { status: ComponentStatus; label: string; detail?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2">
      <span className={`h-2.5 w-2.5 rounded-full ${DOT[status]} ${status === "healthy" ? "animate-pulse" : ""}`} />
      <div>
        <p className="text-xs font-medium text-[var(--text-primary)]">{label}</p>
        {detail && <p className="text-[11px] text-[var(--text-muted)]">{detail}</p>}
      </div>
    </div>
  );
}

function HealthSnapshotBar() {
  const { isLiveStream } = useGlass();
  const [snap, setSnap] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSnapshot = async (isInitial: boolean) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch("/api/health", { headers: getAuthHeaders(), cache: "no-store" });
      if (!res.ok && res.status !== 503) throw new Error("health unavailable");
      setSnap(await res.json());
    } catch {
      /* snapshot is optional; the full dashboard below still renders */
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  /* Initial load + realtime poller so the bar tracks the live dashboard. */
  useEffect(() => {
    loadSnapshot(true);
  }, []);
  usePolling(() => { loadSnapshot(false); }, { intervalMs: isLiveStream ? 15_000 : 60_000 });

  if (loading || !snap) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <PageLoading />
      </div>
    );
  }

  const gateways = snap.components?.gateways;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <StatusDot
        status={snap.status}
        label="Overall"
        detail={snap.status === "healthy" ? "All systems nominal" : `Status: ${snap.status}`}
      />
      <StatusDot
        status={snap.components?.database?.status ?? "unknown"}
        label="Database"
        detail={typeof snap.components?.database?.latency === "number" ? `${snap.components.database.latency}ms` : undefined}
      />
      <StatusDot
        status={gateways?.status ?? "unknown"}
        label="Gateways"
        detail={typeof gateways?.online === "number" ? `${gateways.online} online / ${gateways?.offline ?? 0} offline` : undefined}
      />
    </div>
  );
}

export default function SystemHealthPage() {
  return (
    
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">System Health</h1>
            <p className="text-xs text-[var(--text-muted)]">
              Live infrastructure status — database, redis, gateways and services.
            </p>
          </div>
        </div>

        <WidgetBoundary title="Health Snapshot">
          <HealthSnapshotBar />
        </WidgetBoundary>

        <WidgetBoundary title="Health Dashboard">
          <HealthDashboard />
        </WidgetBoundary>
      </div>
    
    

  );
}
