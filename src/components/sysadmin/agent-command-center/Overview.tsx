"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, Share2, Server, CheckCircle2, AlertTriangle, RefreshCw, Info } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ProgressBar, ProgressBarTrack, ProgressBarFill } from "@/components/ui/meter";
import { HoverPreview, MetricPreview } from "@/components/shared/HoverPreview";
import { DualThroughputCurve } from "@/components/sysadmin/kit/viz";

interface OverviewProps {
  refreshSignal?: number;
}

interface AutomationControlsResponse {
  controls: Array<{ name: string; enabled: boolean; reason: string | null }>;
}

interface ActionsResponse {
  actions: Array<{ id: string; status: string }>;
}

interface IntegrationsResponse {
  items: Array<{ id: string; name?: string; enabled?: boolean | null; status?: string | null }>;
}

interface InfrastructureResponse {
  host?: { hostname?: string };
}

interface KpiData {
  automationsRunning: number | null;
  automationsTotal: number | null;
  connectedServices: number | null;
  connectedServicesTotal: number | null;
  activeNodes: number | null;
  successRate: number | null;
  completedActions: number | null;
  totalFinishedActions: number | null;
}

type Timeframe = "daily" | "weekly" | "monthly";

export function Overview({ refreshSignal = 0 }: OverviewProps) {
  const { request } = useApi();
  const [kpis, setKpis] = useState<KpiData>({
    automationsRunning: null,
    automationsTotal: null,
    connectedServices: null,
    connectedServicesTotal: null,
    activeNodes: null,
    successRate: null,
    completedActions: null,
    totalFinishedActions: null,
  });

  const [loadingAutomations, setLoadingAutomations] = useState(true);
  const [errorAutomations, setErrorAutomations] = useState<string | null>(null);
  const [loadingActions, setLoadingActions] = useState(true);
  const [errorActions, setErrorActions] = useState<string | null>(null);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [errorIntegrations, setErrorIntegrations] = useState<string | null>(null);
  const [loadingInfra, setLoadingInfra] = useState(true);
  const [errorInfra, setErrorInfra] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");

  const fetchAutomations = useCallback(async () => {
    setLoadingAutomations(true);
    setErrorAutomations(null);
    try {
      const res = await request<AutomationControlsResponse>("/api/sysadmin/automation-controls");
      if (res.success && res.data) {
        const controls = Array.isArray(res.data.controls) ? res.data.controls : [];
        const running = controls.filter((c) => c.enabled === true).length;
        setKpis((prev) => ({ ...prev, automationsRunning: running, automationsTotal: controls.length }));
      } else {
        setErrorAutomations(res.error || "Failed to load automation controls");
        setKpis((prev) => ({ ...prev, automationsRunning: null, automationsTotal: null }));
      }
    } catch (err) {
      setErrorAutomations(err instanceof Error ? err.message : "Network error");
      setKpis((prev) => ({ ...prev, automationsRunning: null, automationsTotal: null }));
    } finally {
      setLoadingAutomations(false);
    }
  }, [request]);

  const fetchActions = useCallback(async () => {
    setLoadingActions(true);
    setErrorActions(null);
    try {
      const res = await request<ActionsResponse>("/api/sysadmin/actions?status=all");
      if (res.success && res.data) {
        const acts = Array.isArray(res.data.actions) ? res.data.actions : [];
        const completed = acts.filter((a) => a.status === "executed" || a.status === "auto_executed").length;
        const failed = acts.filter((a) => a.status === "rejected" || a.status === "expired").length;
        const total = completed + failed;
        const rate = total > 0 ? Math.round((completed / total) * 100) : null;
        setKpis((prev) => ({
          ...prev,
          successRate: rate,
          completedActions: completed,
          totalFinishedActions: total,
        }));
      } else {
        setErrorActions(res.error || "Failed to load actions");
        setKpis((prev) => ({ ...prev, successRate: null, completedActions: null, totalFinishedActions: null }));
      }
    } catch (err) {
      setErrorActions(err instanceof Error ? err.message : "Network error");
      setKpis((prev) => ({ ...prev, successRate: null, completedActions: null, totalFinishedActions: null }));
    } finally {
      setLoadingActions(false);
    }
  }, [request]);

  const fetchIntegrations = useCallback(async () => {
    setLoadingIntegrations(true);
    setErrorIntegrations(null);
    try {
      const res = await request<IntegrationsResponse>("/api/admin/platform/integrations/overview");
      if (res.success && res.data) {
        const items = Array.isArray(res.data.items) ? res.data.items : [];
        const connected = items.filter((item) => {
          const isEnabled = item.enabled !== false;
          const isHealthy = !item.status || ["connected", "active", "ok"].includes(item.status.toLowerCase());
          return isEnabled && isHealthy;
        }).length;
        setKpis((prev) => ({ ...prev, connectedServices: connected, connectedServicesTotal: items.length }));
      } else {
        setErrorIntegrations(res.error || "Failed to load integrations");
        setKpis((prev) => ({ ...prev, connectedServices: null, connectedServicesTotal: null }));
      }
    } catch (err) {
      setErrorIntegrations(err instanceof Error ? err.message : "Network error");
      setKpis((prev) => ({ ...prev, connectedServices: null, connectedServicesTotal: null }));
    } finally {
      setLoadingIntegrations(false);
    }
  }, [request]);

  const fetchInfra = useCallback(async () => {
    setLoadingInfra(true);
    setErrorInfra(null);
    try {
      const res = await request<InfrastructureResponse>("/api/sysadmin/infrastructure");
      if (res.success && res.data) {
        const nodes = res.data.host?.hostname ? 1 : 0;
        setKpis((prev) => ({ ...prev, activeNodes: nodes }));
      } else {
        setErrorInfra(res.error || "Failed to load infrastructure telemetry");
        setKpis((prev) => ({ ...prev, activeNodes: null }));
      }
    } catch (err) {
      setErrorInfra(err instanceof Error ? err.message : "Network error");
      setKpis((prev) => ({ ...prev, activeNodes: null }));
    } finally {
      setLoadingInfra(false);
    }
  }, [request]);

  useEffect(() => {
    fetchAutomations();
    fetchActions();
    fetchIntegrations();
    fetchInfra();
  }, [fetchAutomations, fetchActions, fetchIntegrations, fetchInfra, refreshSignal]);

  return (
    <div className="flex flex-col gap-6">
      {/* 4 Segmented Progress KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTileCard
          label="Automations Running"
          value={kpis.automationsRunning !== null ? kpis.automationsRunning : "—"}
          hint={kpis.automationsTotal !== null ? `${kpis.automationsRunning} of ${kpis.automationsTotal} enabled` : "No controls configured"}
          icon={Play}
          tone={kpis.automationsRunning !== null && kpis.automationsRunning > 0 ? "ok" : "warn"}
          loading={loadingAutomations}
          error={errorAutomations}
          onRetry={fetchAutomations}
          progressPercent={kpis.automationsTotal && kpis.automationsRunning !== null ? (kpis.automationsRunning / kpis.automationsTotal) * 100 : 0}
          segments={kpis.automationsTotal && kpis.automationsTotal > 0 ? Math.min(kpis.automationsTotal, 10) : 5}
          filledSegments={kpis.automationsTotal && kpis.automationsRunning !== null && kpis.automationsTotal > 0 ? Math.round((kpis.automationsRunning / kpis.automationsTotal) * Math.min(kpis.automationsTotal, 10)) : 0}
        />

        <KpiTileCard
          label="Connected Services"
          value={kpis.connectedServices !== null ? kpis.connectedServices : "—"}
          hint={kpis.connectedServicesTotal !== null ? `${kpis.connectedServices} of ${kpis.connectedServicesTotal} active` : "No integrations found"}
          icon={Share2}
          tone={kpis.connectedServices !== null && kpis.connectedServices > 0 ? "ok" : "warn"}
          loading={loadingIntegrations}
          error={errorIntegrations}
          onRetry={fetchIntegrations}
          progressPercent={kpis.connectedServicesTotal && kpis.connectedServices !== null ? (kpis.connectedServices / kpis.connectedServicesTotal) * 100 : 0}
          segments={kpis.connectedServicesTotal && kpis.connectedServicesTotal > 0 ? Math.min(kpis.connectedServicesTotal, 8) : 4}
          filledSegments={kpis.connectedServicesTotal && kpis.connectedServices !== null && kpis.connectedServicesTotal > 0 ? Math.round((kpis.connectedServices / kpis.connectedServicesTotal) * Math.min(kpis.connectedServicesTotal, 8)) : 0}
        />

        <KpiTileCard
          label="Active Nodes"
          value={kpis.activeNodes !== null ? kpis.activeNodes : "—"}
          hint={kpis.activeNodes !== null && kpis.activeNodes > 0 ? `${kpis.activeNodes} host node active` : "No node telemetry"}
          icon={Server}
          tone={kpis.activeNodes !== null && kpis.activeNodes > 0 ? "ok" : "warn"}
          loading={loadingInfra}
          error={errorInfra}
          onRetry={fetchInfra}
          progressPercent={kpis.activeNodes && kpis.activeNodes > 0 ? 100 : 0}
          segments={4}
          filledSegments={kpis.activeNodes && kpis.activeNodes > 0 ? 4 : 0}
        />

        <KpiTileCard
          label="Success Rate"
          value={kpis.successRate !== null ? `${kpis.successRate}%` : "—"}
          hint={kpis.totalFinishedActions !== null && kpis.totalFinishedActions > 0 ? `${kpis.completedActions}/${kpis.totalFinishedActions} actions executed` : "No finished actions"}
          icon={CheckCircle2}
          tone={kpis.successRate === null ? "warn" : kpis.successRate >= 95 ? "ok" : kpis.successRate >= 80 ? "warn" : "error"}
          loading={loadingActions}
          error={errorActions}
          onRetry={fetchActions}
          progressPercent={kpis.successRate ?? 0}
          segments={5}
          filledSegments={kpis.successRate !== null ? Math.round((kpis.successRate / 100) * 5) : 0}
        />
      </div>

      {/* Dual-curve Agent Activity section */}
      <div className="surface-card bg-bg-surface p-5 flex flex-col gap-4 rounded-xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-text-primary">Agent Activity</h2>
            <span className="text-xs text-text-muted">Throughput &amp; Success telemetry</span>
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
              <Tabs.List className="h-8">
                <Tabs.Tab value="daily" className="px-2.5 py-1 text-xs">Daily</Tabs.Tab>
                <Tabs.Tab value="weekly" className="px-2.5 py-1 text-xs">Weekly</Tabs.Tab>
                <Tabs.Tab value="monthly" className="px-2.5 py-1 text-xs">Monthly</Tabs.Tab>
              </Tabs.List>
            </Tabs>
          </div>
        </div>

        {/* Explicit empty state — no agent-activity queryId exists in registry */}
        <div className="rounded-lg border border-border/60 bg-bg-base/40 p-8 flex flex-col items-center justify-center text-center gap-3">
          <div className="size-10 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted">
            <Info className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h3 className="text-sm font-medium text-text-primary">No agent-activity telemetry yet</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              No dedicated agent queryId is registered in the Prometheus proxy. Telemetry streams will display req/s and %OK curves here once configured.
            </p>
          </div>
          <div className="pt-2">
            <DualThroughputCurve
              primary={[]}
              secondary={[]}
              primaryLabel="Throughput (req/s)"
              secondaryLabel="Success (%OK)"
              windowLabel={timeframe === "daily" ? "last 24h" : timeframe === "weekly" ? "last 7d" : "last 30d"}
              emptyMessage="No agent-activity telemetry yet"
              className="w-full max-w-md hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Segmented Progress KPI Card Component ─────────────────────────────────────

interface KpiTileCardProps {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  tone: "ok" | "warn" | "error";
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  progressPercent: number;
  segments: number;
  filledSegments: number;
}

function KpiTileCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  loading,
  error,
  onRetry,
  progressPercent,
  segments,
  filledSegments,
}: KpiTileCardProps) {
  const toneColor =
    tone === "error"
      ? "var(--action-danger, #ef4444)"
      : tone === "warn"
      ? "var(--action-warning, #f59e0b)"
      : "var(--action-primary, #10b981)";

  if (error) {
    return (
      <div className="surface-card bg-bg-surface p-4 flex flex-col justify-between gap-3 rounded-xl border border-border">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-text-muted">{label}</span>
          <AlertTriangle className="h-4 w-4 text-action-danger shrink-0" />
        </div>
        <div className="text-xs text-action-danger line-clamp-2">{error}</div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="w-full flex items-center justify-center gap-1.5 text-xs h-7"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  const cardBody = (
    <div className="surface-card bg-bg-surface p-4 flex flex-col gap-3 rounded-xl border border-border">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center justify-center size-6 rounded-lg shrink-0"
            style={{ backgroundColor: `color-mix(in srgb, ${toneColor} 16%, transparent)` }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: toneColor }} />
          </span>
          <span className="text-xs font-medium text-text-muted truncate">{label}</span>
        </div>
        {loading && (
          <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-border border-t-action-primary" />
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div
          className="text-2xl font-semibold tracking-tight"
          style={{ color: value === "—" ? "var(--text-muted)" : toneColor }}
        >
          {loading ? "…" : value}
        </div>
      </div>

      {/* Segmented Progress Bar */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center gap-1">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors duration-300"
              style={{
                backgroundColor:
                  i < filledSegments
                    ? toneColor
                    : "color-mix(in srgb, var(--border) 60%, transparent)",
              }}
            />
          ))}
        </div>
        <ProgressBar value={progressPercent} className="sr-only">
          <ProgressBarTrack>
            <ProgressBarFill />
          </ProgressBarTrack>
        </ProgressBar>
      </div>

      <div className="text-xs text-text-muted -mt-0.5 truncate">{hint}</div>
    </div>
  );

  return (
    <HoverPreview preview={<MetricPreview label={label} value={String(value)} hint={hint} />}>
      <div className="block rounded-xl transition-shadow hover:ring-1 hover:ring-action-primary/30">
        {cardBody}
      </div>
    </HoverPreview>
  );
}

export default Overview;
