"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Server,
  Activity,
  Cpu,
  RefreshCw,
  AlertTriangle,
  Radio,
  Clock,
  Layers,
  Webhook,
  ToggleLeft,
  Database,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { DockerFleetPanel } from "@/components/sysadmin/monitoring/DockerFleetPanel";
import { ObservabilityStackPanel } from "@/components/sysadmin/monitoring/ObservabilityStackPanel";
import { RadialGaugeCard } from "@/components/sysadmin/kit/viz/RadialGaugeCard";
import { Switch, SwitchControl, SwitchThumb } from "@/components/ui/switch";

interface InfraData {
  host?: {
    hostname?: string;
    platform?: string;
    arch?: string;
    uptimeSeconds?: number;
    loadAvg?: number[];
    cpuCount?: number;
    memory?: {
      totalBytes?: number;
      freeBytes?: number;
      usedBytes?: number;
      usedPercent?: number;
    };
  };
  disk?: {
    path?: string;
    totalBytes?: number;
    availableBytes?: number;
    usedPercent?: number;
  } | null;
  postgres?: {
    connections?: {
      total?: number;
      active?: number;
      idle?: number;
      maxConns?: string | null;
    };
  } | null;
  prometheus?: {
    reachable?: boolean;
    cpuPercent?: number | null;
    memoryPercent?: number | null;
    diskPercent?: number | null;
    bandwidthPercent?: number | null;
  };
}

interface RedisWorkerData {
  redis?: {
    status?: string;
    latencyMs?: number;
    connected?: boolean;
    [k: string]: unknown;
  } | null;
  redisDetails?: {
    connectedClients?: number | null;
    usedMemoryBytes?: number | null;
    opsPerSecond?: number | null;
  } | null;
  worker?: {
    status?: string;
    activeWorkers?: number;
    [k: string]: unknown;
  } | null;
  error?: string;
}

interface JobsOverviewData {
  totalRuns24h?: number;
  success24h?: number;
  failed24h?: number;
  dlq?: number;
  healthyPct?: number;
  avgDurationMs?: number;
  rows?: Array<{ id: string; name: string }>;
}

interface ScheduledJobRow {
  id: string;
  name: string;
  description?: string;
  cron_expression?: string;
  enabled?: boolean;
  last_run?: string | null;
  next_run?: string | null;
}

interface ScheduledJobsResponse {
  rows?: ScheduledJobRow[];
  runs?: unknown[];
}

interface IntegrationItem {
  id: string;
  name?: string;
  type?: string;
  enabled?: boolean;
  status?: string | null;
  last_sync?: string | null;
}

interface FeatureFlagItem {
  id: string;
  enabled?: boolean;
  value?: unknown;
  name?: string;
}

interface WebhookItem {
  id: string;
  url?: string;
  events?: string[];
  enabled?: boolean;
}

interface SectionWrapperProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  children: React.ReactNode;
}

function SectionWrapper({
  title,
  subtitle,
  icon,
  loading,
  error,
  onRetry,
  children,
}: SectionWrapperProps) {
  return (
    <div className="surface-card rounded-xl border border-border bg-bg-surface p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="text-text-primary">{icon}</div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            {subtitle ? (
              <p className="text-xs text-text-muted">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={loading}
          className="surface-card inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-bg-elevated disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Retry
        </button>
      </div>

      {error ? (
        <div className="flex items-center justify-between rounded-lg border border-action-danger/30 bg-action-danger/10 p-3 text-xs text-action-danger">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Failed to load section: {error}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="font-medium underline hover:opacity-80"
          >
            Retry fetch
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-8 text-xs text-text-muted">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin text-text-muted" />
          Loading telemetry...
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function InfraWorkers({ refreshSignal }: { refreshSignal?: number }) {
  const api = useApi();

  const [infraData, setInfraData] = useState<InfraData | null>(null);
  const [infraLoading, setInfraLoading] = useState(true);
  const [infraError, setInfraError] = useState<string | null>(null);

  const [redisData, setRedisData] = useState<RedisWorkerData | null>(null);
  const [redisLoading, setRedisLoading] = useState(true);
  const [redisError, setRedisError] = useState<string | null>(null);

  const [jobsOverview, setJobsOverview] = useState<JobsOverviewData | null>(null);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJobRow[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobMutatingId, setJobMutatingId] = useState<string | null>(null);

  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [platformLoading, setPlatformLoading] = useState(true);
  const [platformError, setPlatformError] = useState<string | null>(null);
  const [integrationMutatingId, setIntegrationMutatingId] = useState<string | null>(null);

  const [fleetKey, setFleetKey] = useState(0);
  const [obsKey, setObsKey] = useState(0);

  const fetchInfra = useCallback(async () => {
    setInfraLoading(true);
    setInfraError(null);
    try {
      const res = await api.request<InfraData>("/api/sysadmin/infrastructure");
      if (res.success && res.data) {
        setInfraData(res.data);
      } else {
        setInfraError(res.error || "Failed to load infrastructure telemetry");
      }
    } catch (err: unknown) {
      setInfraError(err instanceof Error ? err.message : "Infrastructure network error");
    } finally {
      setInfraLoading(false);
    }
  }, [api]);

  const fetchRedisWorker = useCallback(async () => {
    setRedisLoading(true);
    setRedisError(null);
    try {
      const res = await api.request<RedisWorkerData>("/api/sysadmin/redis-worker");
      if (res.success && res.data) {
        setRedisData(res.data);
      } else {
        setRedisError(res.error || "Failed to load Redis & worker health");
      }
    } catch (err: unknown) {
      setRedisError(err instanceof Error ? err.message : "Redis/Worker network error");
    } finally {
      setRedisLoading(false);
    }
  }, [api]);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const [resOverview, resScheduled] = await Promise.all([
        api.request<JobsOverviewData>("/api/admin/jobs/overview"),
        api.request<ScheduledJobsResponse>("/api/admin/scheduled-jobs"),
      ]);

      if (resOverview.success && resOverview.data) {
        setJobsOverview(resOverview.data);
      }
      if (resScheduled.success && resScheduled.data) {
        setScheduledJobs(resScheduled.data.rows || []);
      }
      if (!resOverview.success && !resScheduled.success) {
        setJobsError(resOverview.error || resScheduled.error || "Failed to fetch jobs");
      }
    } catch (err: unknown) {
      setJobsError(err instanceof Error ? err.message : "Jobs network error");
    } finally {
      setJobsLoading(false);
    }
  }, [api]);

  const fetchPlatform = useCallback(async () => {
    setPlatformLoading(true);
    setPlatformError(null);
    try {
      const [resIntegrations, resFlags, resWebhooks] = await Promise.all([
        api.request<{ items: IntegrationItem[] }>("/api/admin/platform/integrations/overview"),
        api.request<{ items: FeatureFlagItem[] }>("/api/admin/platform/feature-flags/overview"),
        api.request<{ items: WebhookItem[] }>("/api/admin/platform/webhooks/overview"),
      ]);

      if (resIntegrations.success && resIntegrations.data) {
        setIntegrations(resIntegrations.data.items || []);
      }
      if (resFlags.success && resFlags.data) {
        setFeatureFlags(resFlags.data.items || []);
      }
      if (resWebhooks.success && resWebhooks.data) {
        setWebhooks(resWebhooks.data.items || []);
      }
      if (!resIntegrations.success && !resFlags.success && !resWebhooks.success) {
        setPlatformError(resIntegrations.error || resFlags.error || resWebhooks.error || "Failed to load platform data");
      }
    } catch (err: unknown) {
      setPlatformError(err instanceof Error ? err.message : "Platform network error");
    } finally {
      setPlatformLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void fetchInfra();
    void fetchRedisWorker();
    void fetchJobs();
    void fetchPlatform();
  }, [fetchInfra, fetchRedisWorker, fetchJobs, fetchPlatform, refreshSignal]);

  const handleToggleJob = async (jobId: string, currentEnabled: boolean) => {
    setJobMutatingId(jobId);
    try {
      const res = await api.request(`/api/admin/jobs/${encodeURIComponent(jobId)}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (res.success) {
        setScheduledJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, enabled: !currentEnabled } : j))
        );
      }
    } finally {
      setJobMutatingId(null);
    }
  };

  const handleToggleIntegration = async (integrationId: string, currentEnabled: boolean) => {
    setIntegrationMutatingId(integrationId);
    try {
      const res = await api.request(`/api/integrations/${encodeURIComponent(integrationId)}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (res.success) {
        setIntegrations((prev) =>
          prev.map((item) =>
            item.id === integrationId ? { ...item, enabled: !currentEnabled } : item
          )
        );
      }
    } finally {
      setIntegrationMutatingId(null);
    }
  };

  const cpuPercent =
    infraData?.prometheus?.cpuPercent != null
      ? infraData.prometheus.cpuPercent
      : infraData?.host?.loadAvg && infraData?.host?.cpuCount
        ? (infraData.host.loadAvg[0] / infraData.host.cpuCount) * 100
        : null;

  const ramPercent =
    infraData?.prometheus?.memoryPercent != null
      ? infraData.prometheus.memoryPercent
      : infraData?.host?.memory?.usedPercent != null
        ? infraData.host.memory.usedPercent
        : null;

  const bandwidthPercent: number | null =
    infraData?.prometheus?.bandwidthPercent != null ? infraData.prometheus.bandwidthPercent : null;

  const gaugeStatus = (val: number | null): "ok" | "warn" | "error" | "neutral" => {
    if (val == null) return "neutral";
    if (val >= 85) return "error";
    if (val >= 60) return "warn";
    return "ok";
  };

  return (
    <div className="space-y-6">
      {/* (f) Host & Node Radial Gauges */}
      <SectionWrapper
        title="Host & Node Hardware Utilization"
        subtitle={
          infraData?.host?.hostname
            ? `Node: ${infraData.host.hostname} (${infraData.host.platform ?? "linux"} / ${infraData.host.arch ?? "x64"})`
            : "Live node metrics from /api/sysadmin/infrastructure"
        }
        icon={<Cpu className="h-4 w-4 text-action-primary" />}
        loading={infraLoading}
        error={infraError}
        onRetry={fetchInfra}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <RadialGaugeCard
            title="CPU Utilization"
            value={cpuPercent}
            status={gaugeStatus(cpuPercent)}
            unit="%"
            meta={infraData?.prometheus?.cpuPercent != null ? "Prometheus" : "OS Load Proxy"}
          />
          <RadialGaugeCard
            title="RAM Utilization"
            value={ramPercent}
            status={gaugeStatus(ramPercent)}
            unit="%"
            meta={infraData?.prometheus?.memoryPercent != null ? "Prometheus" : "Host Memory"}
          />
          <RadialGaugeCard
            title="Bandwidth"
            value={bandwidthPercent}
            status={gaugeStatus(bandwidthPercent)}
            unit="%"
            meta="No Network Counter"
          />
        </div>
      </SectionWrapper>

      {/* (a) Docker Fleet Panel — Reused */}
      <SectionWrapper
        title="Container Fleet Management"
        subtitle="Live container states and per-container resource metrics"
        icon={<Server className="h-4 w-4 text-action-success" />}
        loading={false}
        error={null}
        onRetry={() => {
          setFleetKey((k) => k + 1);
        }}
      >
        <DockerFleetPanel key={fleetKey} />
      </SectionWrapper>

      {/* (b) Observability Stack Panel — Reused */}
      <SectionWrapper
        title="Observability & Telemetry Stack"
        subtitle="Host telemetry, Prometheus scrape targets, and Loki container logs"
        icon={<Activity className="h-4 w-4 text-action-primary" />}
        loading={false}
        error={null}
        onRetry={() => {
          setObsKey((k) => k + 1);
        }}
      >
        <ObservabilityStackPanel key={obsKey} />
      </SectionWrapper>

      {/* (c) Redis & Background Worker Health */}
      <SectionWrapper
        title="Redis & Background Worker Health"
        subtitle="Cache engine ping, worker queue daemon, and Prometheus metrics"
        icon={<Database className="h-4 w-4 text-action-warning" />}
        loading={redisLoading}
        error={redisError}
        onRetry={fetchRedisWorker}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-bg-elevated/40 p-4">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-text-muted">Redis Cache Layer</span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-medium ${
                  redisData?.redis?.status === "healthy" || redisData?.redis?.connected
                    ? "bg-action-success/15 text-action-success"
                    : "bg-action-warning/15 text-action-warning"
                }`}
              >
                {String(redisData?.redis?.status ?? "unknown")}
              </span>
            </div>
            <div className="mt-2 space-y-1.5 text-xs text-text-secondary">
              <div className="flex justify-between">
                <span>Latency:</span>
                <span className="font-mono text-text-primary">
                  {redisData?.redis?.latencyMs != null ? `${redisData.redis.latencyMs} ms` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Connected Clients:</span>
                <span className="font-mono text-text-primary">
                  {redisData?.redisDetails?.connectedClients != null
                    ? redisData.redisDetails.connectedClients
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Used Memory:</span>
                <span className="font-mono text-text-primary">
                  {redisData?.redisDetails?.usedMemoryBytes != null
                    ? `${(redisData.redisDetails.usedMemoryBytes / (1024 * 1024)).toFixed(1)} MiB`
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Operations / sec:</span>
                <span className="font-mono text-text-primary">
                  {redisData?.redisDetails?.opsPerSecond != null
                    ? redisData.redisDetails.opsPerSecond.toFixed(1)
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-bg-elevated/40 p-4">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-text-muted">Queue Worker Liveness</span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-medium ${
                  redisData?.worker?.status === "healthy" || redisData?.worker?.status === "up"
                    ? "bg-action-success/15 text-action-success"
                    : "bg-action-danger/15 text-action-danger"
                }`}
              >
                {String(redisData?.worker?.status ?? "unknown")}
              </span>
            </div>
            <div className="mt-2 space-y-1.5 text-xs text-text-secondary">
              <div className="flex justify-between">
                <span>Active Runners:</span>
                <span className="font-mono text-text-primary">
                  {redisData?.worker?.activeWorkers != null ? redisData.worker.activeWorkers : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Worker Service:</span>
                <span className="font-mono text-text-primary">
                  {redisData?.worker?.status ? "Registered" : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* (d) Scheduled Jobs & Automation Jobs */}
      <SectionWrapper
        title="Scheduled & Automation Jobs"
        subtitle="24h execution metrics and scheduled automation triggers"
        icon={<Clock className="h-4 w-4 text-action-primary" />}
        loading={jobsLoading}
        error={jobsError}
        onRetry={fetchJobs}
      >
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border/60 bg-bg-elevated/30 p-2.5">
            <div className="text-[11px] text-text-muted">Health Rate (24h)</div>
            <div className="text-lg font-bold text-text-primary">
              {jobsOverview?.healthyPct != null ? `${jobsOverview.healthyPct}%` : "N/A"}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-bg-elevated/30 p-2.5">
            <div className="text-[11px] text-text-muted">Total Runs (24h)</div>
            <div className="text-lg font-bold text-text-primary">
              {jobsOverview?.totalRuns24h != null ? jobsOverview.totalRuns24h : "N/A"}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-bg-elevated/30 p-2.5">
            <div className="text-[11px] text-text-muted">Failed Runs</div>
            <div className="text-lg font-bold text-action-danger">
              {jobsOverview?.failed24h != null ? jobsOverview.failed24h : "N/A"}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-bg-elevated/30 p-2.5">
            <div className="text-[11px] text-text-muted">Avg Duration</div>
            <div className="text-lg font-bold text-text-primary">
              {jobsOverview?.avgDurationMs != null ? `${jobsOverview.avgDurationMs} ms` : "N/A"}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border text-text-muted">
              <tr>
                <th className="py-2">Job Name</th>
                <th className="py-2">Schedule</th>
                <th className="py-2">Last Run</th>
                <th className="py-2 text-right">State / Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {scheduledJobs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-text-muted">
                    No scheduled jobs configured in database.
                  </td>
                </tr>
              ) : (
                scheduledJobs.map((job) => (
                  <tr key={job.id}>
                    <td className="py-2.5 font-medium text-text-primary">
                      {job.name}
                      {job.description ? (
                        <p className="text-[10px] text-text-muted">{job.description}</p>
                      ) : null}
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-text-secondary">
                      {job.cron_expression || "—"}
                    </td>
                    <td className="py-2.5 text-text-muted">
                      {job.last_run ? new Date(job.last_run).toLocaleString() : "Never"}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <span className="font-mono text-[11px] text-text-muted">
                          {job.enabled ? "Active" : "Disabled"}
                        </span>
                        <Switch
                          isSelected={Boolean(job.enabled)}
                          isDisabled={jobMutatingId === job.id}
                          onChange={() => handleToggleJob(job.id, Boolean(job.enabled))}
                          aria-label={`Toggle ${job.name}`}
                        >
                          <SwitchControl>
                            <SwitchThumb />
                          </SwitchControl>
                        </Switch>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionWrapper>

      {/* (e) Integrations, Feature Flags & Webhooks */}
      <SectionWrapper
        title="Integrations, Feature Flags & Webhooks"
        subtitle="Platform connections with backed mutation endpoints vs read-only flags"
        icon={<Layers className="h-4 w-4 text-action-primary" />}
        loading={platformLoading}
        error={platformError}
        onRetry={fetchPlatform}
      >
        <div className="space-y-5">
          {/* Integrations — real PATCH /api/integrations/[id] */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-text-primary">
              <Radio className="h-3.5 w-3.5 text-action-primary" />
              <span>Campus Integrations</span>
              <span className="text-[10px] text-action-success">(Backed by PATCH /api/integrations/[id])</span>
            </div>
            {integrations.length === 0 ? (
              <p className="text-xs text-text-muted">No integration configs found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {integrations.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-bg-elevated/30 p-2.5"
                  >
                    <div>
                      <div className="text-xs font-medium text-text-primary">{item.name || item.id}</div>
                      <div className="text-[11px] text-text-muted">
                        Type: {item.type || "custom"} · Status: {item.status || "idle"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        isSelected={Boolean(item.enabled)}
                        isDisabled={integrationMutatingId === item.id}
                        onChange={() => handleToggleIntegration(item.id, Boolean(item.enabled))}
                        aria-label={`Toggle ${item.name || item.id}`}
                      >
                        <SwitchControl>
                          <SwitchThumb />
                        </SwitchControl>
                      </Switch>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feature Flags — Disabled (no write endpoint) */}
          <div className="border-t border-border/50 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                <ToggleLeft className="h-3.5 w-3.5 text-text-muted" />
                <span>Feature Flags</span>
              </div>
              <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
                no write endpoint (read-only)
              </span>
            </div>
            {featureFlags.length === 0 ? (
              <p className="text-xs text-text-muted">No feature flags registered.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {featureFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-bg-elevated/20 p-2.5 opacity-80"
                  >
                    <div>
                      <div className="text-xs font-medium text-text-primary">{flag.name || flag.id}</div>
                      <div className="text-[10px] text-text-muted">system_settings / feature_flags</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] italic text-text-muted">no write endpoint</span>
                      <Switch
                        isSelected={Boolean(flag.enabled)}
                        isDisabled={true}
                        aria-label={`Flag ${flag.id} (read-only)`}
                      >
                        <SwitchControl>
                          <SwitchThumb />
                        </SwitchControl>
                      </Switch>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Webhooks — Disabled (no write endpoint) */}
          <div className="border-t border-border/50 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                <Webhook className="h-3.5 w-3.5 text-text-muted" />
                <span>Webhooks Subscription</span>
              </div>
              <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
                no write endpoint (read-only)
              </span>
            </div>
            {webhooks.length === 0 ? (
              <p className="text-xs text-text-muted">No webhooks registered.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {webhooks.map((hook) => (
                  <div
                    key={hook.id}
                    className="flex items-center justify-between rounded-lg border border-border/40 bg-bg-elevated/20 p-2.5 opacity-80"
                  >
                    <div>
                      <div className="text-xs font-medium text-text-primary font-mono truncate max-w-[200px]">
                        {hook.url || hook.id}
                      </div>
                      <div className="text-[10px] text-text-muted">
                        Events: {hook.events ? hook.events.join(", ") : "all"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] italic text-text-muted">no write endpoint</span>
                      <Switch
                        isSelected={hook.enabled !== false}
                        isDisabled={true}
                        aria-label={`Webhook ${hook.id} (read-only)`}
                      >
                        <SwitchControl>
                          <SwitchThumb />
                        </SwitchControl>
                      </Switch>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionWrapper>
    </div>
  );
}

export default InfraWorkers;
