"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TabKey = "overview" | "services" | "database" | "redis" | "network" | "logs" | "workers" | "backups" | "deployments" | "security" | "operations";

interface OpsAgentStatus {
  reachable: boolean;
  uptime_s: number | null;
  registered_ops: string[];
}

interface CenterData {
  collected_at: string;
  infrastructure: {
    hostname: string;
    uptime_seconds: number;
    load_avg: number[];
    cpu_count: number;
    memory_total_bytes: number;
    memory_used_pct: number;
  };
  database: {
    available: boolean;
    connections: { total: number; active: number; idle: number };
    size_bytes: number;
    locks_count: number;
    top_tables: { relname: string; n_live_tup: string }[];
  };
  backups: { name: string; size_bytes: number; modified_at: string; age_hours: number }[];
  workers: {
    scheduled_jobs: { job_name: string; last_run_at: string | null; last_status: string | null; last_duration_ms: number | null }[];
  };
  logs: {
    audit_events: { id: string; action: string; role: string; created_at: string }[];
    security_alerts: { id: string; alert_type: string; severity: string; status: string; message: string; created_at: string }[];
  };
  security: { failed_logins_24h: number; open_alerts: number };
  deployments: { version: string; deployed_at: string; message: string; source: string }[];
  monitoring: {
    prometheus: { ok: boolean; status: number | null; latency_ms: number };
    grafana_url: string;
  };
}

export default function SysadminAdminCenterPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("overview");
  const [data, setData] = useState<CenterData | null>(null);
  const [opsAgent, setOpsAgent] = useState<OpsAgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opMsg, setOpMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/sysadmin/center")
      .then((r) => r.json())
      .then((j) => {
        if (j?.data) setData(j.data);
        else setError(j?.error?.message ?? "Failed to load center data");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Network error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    fetch("/api/sysadmin/operations/agent-status")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.data) setOpsAgent(j.data);
        else setOpsAgent({ reachable: false, uptime_s: null, registered_ops: [] });
      })
      .catch(() => setOpsAgent({ reachable: false, uptime_s: null, registered_ops: [] }));
  }, []);

  async function runOp(action: string, params?: Record<string, unknown>) {
    setOpMsg(null);
    const r = await fetch("/api/sysadmin/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, params }),
    });
    const j = await r.json();
    if (j?.success) {
      setOpMsg(`✓ ${action}: ${JSON.stringify(j.data?.result ?? {})}`);
      load();
    } else {
      setOpMsg(`✗ ${action}: ${j?.error?.message ?? r.status}`);
    }
  }

  const fmtBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  if (loading) {
    return (
      <div className="p-6 text-sm">
        <span className="text-foreground">Loading System Administration Center…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">System Administration Center</h1>
          <p className="text-xs">
            {data?.infrastructure.hostname ?? "unknown host"} •{" "}
            {new Date(data?.collected_at ?? Date.now()).toLocaleString()}
            {opsAgent && (
              <span className={`ml-2 ${opsAgent.reachable ? "text-action-success" : "text-action-danger"}`}>
                {opsAgent.reachable ? "· ops-agent ONLINE" : "· ops-agent OFFLINE"}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(["overview", "services", "database", "redis", "network", "logs", "workers", "backups", "deployments", "security"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`px-2.5 py-1 text-xs font-medium ${
                tab === k ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-action-danger/10 p-3 text-xs text-action-danger">
          {error}
          <button type="button" onClick={load} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      {opMsg && <div className="text-xs">{opMsg}</div>}

      {/* Overview */}
      {tab === "overview" && data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-4">
            <p className="text-xs font-medium">Host Uptime</p>
            <p className="text-2xl font-bold">{Math.round(data.infrastructure.uptime_seconds / 3600)}h</p>
            <p className="text-xs text-muted">
              Load: {data.infrastructure.load_avg.map((n) => n.toFixed(2)).join(" ")} • {data.infrastructure.cpu_count} CPUs
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium">Memory</p>
            <p className="text-2xl font-bold">{data.infrastructure.memory_used_pct}%</p>
            <p className="text-xs text-muted">{fmtBytes(data.infrastructure.memory_total_bytes)} total</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium">PostgreSQL</p>
            <p className="text-2xl font-bold">{data.database.available ? "ONLINE" : "OFFLINE"}</p>
            <p className="text-xs text-muted">
              {data.database.connections.active} active / {data.database.connections.total} total
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium">Prometheus</p>
            <p className={`text-2xl font-bold ${data.monitoring.prometheus.ok ? "text-action-success" : "text-action-danger"}`}>
              {data.monitoring.prometheus.ok ? "OK" : "DOWN"}
            </p>
            <p className="text-xs text-muted">{data.monitoring.prometheus.latency_ms}ms</p>
          </div>
        </div>
      )}

      {/* Services */}
      {tab === "services" && (
        <div className="space-y-3">
          <p className="text-xs">
            Container telemetry: see <button type="button" onClick={() => router.push("/sysadmin/docker-services")} className="underline">/sysadmin/docker-services</button>
          </p>
          <p className="text-xs">
            Fleet panel: <button type="button" onClick={() => router.push("/sysadmin/infrastructure")} className="underline">/sysadmin/infrastructure</button>
          </p>
        </div>
      )}

      {/* Database */}
      {tab === "database" && data && (
        <div className="space-y-3">
          <div className="p-4">
            <p className="text-sm font-bold">PostgreSQL</p>
            <div className="mt-2 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted">Connections</p>
                <p className="text-xl font-mono">{data.database.connections.total}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Database Size</p>
                <p className="text-xl font-mono">{fmtBytes(data.database.size_bytes)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Locks</p>
                <p className="text-xl font-mono">{data.database.locks_count}</p>
              </div>
            </div>
          </div>
          {data.database.top_tables.length > 0 && (
            <div className="p-4">
              <p className="text-sm font-bold">Top Tables by Row Count</p>
              <div className="mt-2 space-y-1">
                {data.database.top_tables.map((t) => (
                  <div key={t.relname} className="flex justify-between text-xs">
                    <span className="font-mono">{t.relname}</span>
                    <span>{t.n_live_tup} rows</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Redis */}
      {tab === "redis" && (
        <div className="space-y-3">
          <p className="text-xs">
            Redis diagnostics: <button type="button" onClick={() => router.push("/sysadmin/redis-worker")} className="underline">/sysadmin/redis-worker</button>
          </p>
        </div>
      )}

      {/* Network */}
      {tab === "network" && data && (
        <div className="space-y-3">
          <div className="p-4">
            <p className="text-sm font-bold">Monitoring Stack</p>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${data.monitoring.prometheus.ok ? "bg-action-success" : "bg-action-danger"}`} />
                <span className="font-mono">Prometheus</span>
                <span>{data.monitoring.prometheus.ok ? "HEALTHY" : "UNREACHABLE"} ({data.monitoring.prometheus.latency_ms}ms)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-mono">Grafana</span>
                <a href={data.monitoring.grafana_url} target="_blank" rel="noopener noreferrer" className="underline">
                  {data.monitoring.grafana_url}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs */}
      {tab === "logs" && data && (
        <div className="space-y-3">
          {data.logs.security_alerts.length > 0 && (
            <div className="p-4">
              <p className="text-sm font-bold">Security Alerts ({data.logs.security_alerts.length})</p>
              <div className="mt-2 space-y-1">
                {data.logs.security_alerts.slice(0, 10).map((a) => (
                  <div key={a.id} className="text-xs">
                    <span className={`font-mono ${a.severity === "critical" ? "text-action-danger" : "text-action-warning"}`}>[{a.severity}]</span>{" "}
                    {a.message}
                    <span className="ml-2 text-muted">{a.created_at?.slice(0, 19).replace("T", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.logs.audit_events.length > 0 && (
            <div className="p-4">
              <p className="text-sm font-bold">Recent Audit Events</p>
              <div className="mt-2 space-y-1">
                {data.logs.audit_events.slice(0, 10).map((e) => (
                  <div key={e.id} className="text-xs flex justify-between">
                    <span>
                      <span className="font-mono text-muted">[{e.role}]</span> {e.action}
                    </span>
                    <span className="text-muted">{e.created_at?.slice(0, 19).replace("T", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.logs.security_alerts.length === 0 && data.logs.audit_events.length === 0 && (
            <div className="p-6 text-center text-sm text-muted">No recent log entries.</div>
          )}
        </div>
      )}

      {/* Workers */}
      {tab === "workers" && data && (
        <div className="space-y-3">
          <div className="p-4">
            <p className="text-sm font-bold">Scheduled Jobs</p>
            <div className="mt-2 space-y-1">
              {data.workers.scheduled_jobs.map((j) => (
                <div key={j.job_name} className="flex justify-between text-xs">
                  <span className="font-mono">{j.job_name}</span>
                  <span className={j.last_status === "ok" ? "text-emerald-400" : j.last_status === "error" ? "text-action-danger" : "text-muted"}>
                    {j.last_status ?? "unknown"} ({j.last_duration_ms ?? 0}ms)
                  </span>
                </div>
              ))}
              {data.workers.scheduled_jobs.length === 0 && (
                <p className="text-xs text-muted">No scheduled jobs found (table may not exist yet).</p>
              )}
            </div>
          </div>
          <p className="text-xs">
            Full dead-man&apos;s-switch view:{" "}
            <button type="button" onClick={() => router.push("/sysadmin/jobs")} className="underline">
              /sysadmin/jobs
            </button>
          </p>
        </div>
      )}

      {/* Backups */}
      {tab === "backups" && data && (
        <div className="space-y-3">
          <div className="p-4">
            <p className="text-sm font-bold">Recent Backups ({data.backups.length})</p>
            {data.backups.length === 0 ? (
              <p className="mt-2 text-xs text-muted">
                No backups found in /opt/monitoring/backups/daily. The backup cron may not have run yet.
              </p>
            ) : (
              <div className="mt-2 space-y-1">
                {data.backups.map((b) => (
                  <div key={b.name} className="flex justify-between text-xs">
                    <span className="font-mono">{b.name}</span>
                    <span>
                      {Math.round(b.size_bytes / 1024)} KB • {b.age_hours}h ago
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-4">
            <p className="text-sm font-bold">Backup Actions</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => runOp("verify_latest_backup")}
                className="bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
              >
                Verify Latest Backup
              </button>
              <button
                type="button"
                onClick={() => runOp("list_backups", { limit: 20 })}
                className="px-3 py-1 text-xs underline"
              >
                List Backups
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deployments */}
      {tab === "deployments" && data && (
        <div className="space-y-3">
          <div className="p-4">
            <p className="text-sm font-bold">Deployment History ({data.deployments.length})</p>
            {data.deployments.length === 0 ? (
              <p className="mt-2 text-xs text-muted">No deployment records found.</p>
            ) : (
              <div className="mt-2 space-y-1">
                {data.deployments.map((d, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="font-mono">{d.version ?? d.message}</span>
                    <span className="text-muted">{d.deployed_at?.slice(0, 19).replace("T", " ")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security */}
      {tab === "security" && data && (
        <div className="space-y-3">
          <div className="p-4">
            <p className="text-sm font-bold">Security (24h)</p>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted">Failed Logins</p>
                <p className="text-xl font-mono">{data.security.failed_logins_24h}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Open Alerts</p>
                <p className="text-xl font-mono">{data.security.open_alerts}</p>
              </div>
            </div>
          </div>
          <p className="text-xs">
            Full security posture:{" "}
            <button type="button" onClick={() => router.push("/sysadmin/security")} className="underline">
              /sysadmin/security
            </button>
          </p>
        </div>
      )}

      {/* Operations */}
      {tab === "operations" && (
        <div className="space-y-3">
          <div className="p-4">
            <p className="text-sm font-bold">Restricted Operations</p>
            <p className="mt-1 text-xs">
              Ops-agent: {opsAgent?.reachable ? `ONLINE (${opsAgent.uptime_s?.toFixed(0)}s uptime)` : "OFFLINE"}
            </p>
            {opsAgent?.reachable && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => runOp("retry_failed_notifications")} className="bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Retry Failed Notifications
                </button>
                <button type="button" onClick={() => runOp("refresh_infra_snapshot")} className="px-3 py-1 text-xs underline">
                  Refresh Infra Snapshot
                </button>
                <button type="button" onClick={() => runOp("host_diagnostics")} className="px-3 py-1 text-xs underline">
                  Host Diagnostics
                </button>
              </div>
            )}
            {!opsAgent?.reachable && (
              <p className="mt-2 text-xs text-action-warning">
                Operations agent is offline. Monitoring data above remains available. Retry when the worker container recovers.
              </p>
            )}
          </div>

          <div className="p-4">
            <p className="text-sm font-bold">Docker Operations</p>
            <p className="mt-1 text-xs">
              Container restart and log inspection are not available in the current deployment.
              The worker image does not contain the Docker CLI and the Docker socket is not
              readable by the worker user. See <code className="font-mono text-xs">docs/future-docker-broker.md</code>
              for the planned restricted broker design.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
