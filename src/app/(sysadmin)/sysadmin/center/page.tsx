"use client";

import { useCallback, useEffect, useState } from "react";

interface InfraData {
  host: {
    hostname: string;
    uptimeSeconds: number;
    loadAvg: number[];
    cpuCount: number;
    memory: { totalBytes: number; usedPercent: number };
  };
  disk: { totalBytes: number; availableBytes: number; usedPercent: number } | null;
  postgres: { connections: { total: number; active: number; idle: number } } | null;
  prometheus: { reachable: boolean; cpuPercent: number | null; memoryPercent: number | null; diskPercent: number | null } | null;
}

interface RedisData {
  reachable: boolean;
  source: string;
  latency_ms: number | null;
  memory: { used_bytes: number; max_bytes: number; used_percent: number | null } | null;
  clients: { connected: number | null } | null;
  keyspace: { total_keys: number | null; hits: number | null; misses: number | null; hit_ratio: number | null } | null;
  queues: { total_depth: number | null } | null;
  error?: string;
}

interface NetworkData {
  internal_services: {
    web_health: { ok: boolean; status: number | null };
    caddy_proxy: { ok: boolean; status: number | null };
    prometheus: { ok: boolean; status: number | null };
  };
  cloudflare_tunnel: { reachable: boolean; via_caddy: boolean };
  prometheus_scrapes: {
    reachable: boolean;
    targets_up: number;
    targets_down: number;
    targets: Array<{ job: string; instance: string; up: boolean; last_error: string | null }>;
  };
  last_checked_at: string;
}

interface LogsData {
  collected_at: string;
  security_alerts: Array<{ id: string; alert_type: string; severity: string; status: string; message: string; created_at: string }>;
  audit_events: Array<{ id: string; action: string; role: string; created_at: string }>;
  worker_errors: Array<{ job_name: string; last_status: string; last_error: string | null; last_run_at: string }>;
}

type TabKey = "overview" | "database" | "redis" | "network" | "logs" | "workers";

export default function SysadminCenterPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [infra, setInfra] = useState<InfraData | null>(null);
  const [redis, setRedis] = useState<RedisData | null>(null);
  const [network, setNetwork] = useState<NetworkData | null>(null);
  const [logs, setLogs] = useState<LogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/api/sysadmin/infrastructure").then((r) => r.json()),
      fetch("/api/sysadmin/redis").then((r) => r.json()),
      fetch("/api/sysadmin/network").then((r) => r.json()),
      fetch("/api/sysadmin/logs").then((r) => r.json()),
    ])
      .then(([infraJ, redisJ, netJ, logsJ]) => {
        if (infraJ?.data) setInfra(infraJ.data);
        if (redisJ?.data) setRedis(redisJ.data);
        if (netJ?.data) setNetwork(netJ.data);
        if (logsJ?.data) setLogs(logsJ.data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fmtBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  if (loading) return <div className="p-6 text-sm text-foreground">Loading System Administration Center…</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">System Administration Center</h1>
          <p className="text-xs text-foreground">
            {infra?.host.hostname ?? "unknown host"} • Updated:{" "}
            {new Date(network?.last_checked_at ?? Date.now()).toISOString().slice(0, 19).replace("T", " ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(["overview", "database", "redis", "network", "logs", "workers"] as const).map((k) => (
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
        <div role="alert" className="bg-rose-500/10 p-3 text-xs text-rose-400">
          {error}
          <button type="button" onClick={load} className="ml-2 text-rose-400 underline">
            Retry
          </button>
        </div>
      )}

      {tab === "overview" && infra && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-4">
            <p className="text-xs font-medium text-foreground">Host Uptime</p>
            <p className="text-2xl font-bold text-foreground">{Math.round(infra.host.uptimeSeconds / 3600)}h</p>
            <p className="text-xs text-foreground">
              Load: {infra.host.loadAvg.map((n) => n.toFixed(2)).join(" ")}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-foreground">Memory</p>
            <p className="text-2xl font-bold text-foreground">{infra.host.memory.usedPercent}%</p>
            <p className="text-xs text-foreground">CPUs: {infra.host.cpuCount}</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-foreground">Disk</p>
            <p className="text-2xl font-bold text-foreground">{infra.disk ? `${infra.disk.usedPercent}%` : "N/A"}</p>
            <p className="text-xs text-foreground">
              {infra.disk ? `${fmtBytes(infra.disk.availableBytes)} free` : "no mount visibility"}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-medium text-foreground">PostgreSQL</p>
            <p className="text-2xl font-bold text-foreground">
              {infra.postgres ? `${infra.postgres.connections.active} active` : "—"}
            </p>
            <p className="text-xs text-foreground">
              {infra.postgres
                ? `${infra.postgres.connections.total} total / ${infra.postgres.connections.idle} idle`
                : "unavailable"}
            </p>
          </div>
        </div>
      )}

      {tab === "database" && infra?.postgres && (
        <div className="space-y-3">
          <div className="p-4">
            <p className="text-sm font-bold text-foreground">PostgreSQL Connections</p>
            <div className="mt-2 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-foreground">Total</p>
                <p className="text-xl font-mono text-foreground">{infra.postgres.connections.total}</p>
              </div>
              <div>
                <p className="text-xs text-foreground">Active</p>
                <p className="text-xl font-mono text-foreground">{infra.postgres.connections.active}</p>
              </div>
              <div>
                <p className="text-xs text-foreground">Idle</p>
                <p className="text-xl font-mono text-foreground">{infra.postgres.connections.idle}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "redis" && redis && (
        <div className="space-y-3">
          <div className="p-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${redis.reachable ? "bg-emerald-500" : "bg-rose-500"}`} />
              <p className="text-sm font-bold text-foreground">
                Redis {redis.reachable ? "ONLINE" : "OFFLINE"} ({redis.source})
              </p>
            </div>
            {redis.error && <p className="mt-1 text-xs text-rose-400">{redis.error}</p>}
            {redis.latency_ms !== null && <p className="mt-1 text-xs text-foreground">Latency: {redis.latency_ms}ms</p>}
          </div>
          {redis.memory && (
            <div className="p-4">
              <p className="text-xs font-medium text-foreground">Memory</p>
              <p className="text-lg font-mono text-foreground">
                {redis.memory.used_percent !== null ? `${redis.memory.used_percent}%` : "—"}
              </p>
            </div>
          )}
          {redis.keyspace && (
            <div className="p-4">
              <p className="text-xs font-medium text-foreground">Keyspace</p>
              <p className="text-lg font-mono text-foreground">
                {redis.keyspace.total_keys !== null ? `${redis.keyspace.total_keys} keys` : "—"}
              </p>
              {redis.keyspace.hit_ratio !== null && (
                <p className="text-xs text-foreground">Hit ratio: {redis.keyspace.hit_ratio}%</p>
              )}
            </div>
          )}
          {redis.queues && (
            <div className="p-4">
              <p className="text-xs font-medium text-foreground">Queue Depth</p>
              <p className="text-lg font-mono text-foreground">{redis.queues.total_depth}</p>
            </div>
          )}
        </div>
      )}

      {tab === "network" && network && (
        <div className="space-y-3">
          <div className="p-4">
            <p className="text-sm font-bold text-foreground">Internal Services</p>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${network.internal_services.web_health.ok ? "bg-emerald-500" : "bg-rose-500"}`} />
                <span className="font-mono">web health</span>
                <span className="text-foreground">{network.internal_services.web_health.ok ? "OK" : "DOWN"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${network.internal_services.caddy_proxy.ok ? "bg-emerald-500" : "bg-rose-500"}`} />
                <span className="font-mono">caddy proxy</span>
                <span className="text-foreground">{network.internal_services.caddy_proxy.ok ? "OK" : "DOWN"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${network.internal_services.prometheus.ok ? "bg-emerald-500" : "bg-rose-500"}`} />
                <span className="font-mono">prometheus</span>
                <span className="text-foreground">{network.internal_services.prometheus.ok ? "OK" : "DOWN"}</span>
              </div>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm font-bold text-foreground">Cloudflare Tunnel</p>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${network.cloudflare_tunnel.reachable ? "bg-emerald-500" : "bg-rose-500"}`} />
              <span>{network.cloudflare_tunnel.reachable ? "Reachable via caddy" : "Unreachable"}</span>
            </div>
          </div>
          {network.prometheus_scrapes.reachable && (
            <div className="p-4">
              <p className="text-sm font-bold text-foreground">Prometheus Scrape Targets</p>
              <p className="text-xs text-foreground mt-1">
                {network.prometheus_scrapes.targets_up} up / {network.prometheus_scrapes.targets_down} down
              </p>
              {network.prometheus_scrapes.targets.filter((t) => !t.up).length > 0 && (
                <div className="mt-2 space-y-1">
                  {network.prometheus_scrapes.targets
                    .filter((t) => !t.up)
                    .map((t) => (
                      <div key={`${t.job}-${t.instance}`} className="flex justify-between text-xs text-rose-400">
                        <span>{t.job} ({t.instance})</span>
                        <span className="text-foreground">{t.last_error ?? "down"}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "logs" && logs && (
        <div className="space-y-3">
          {logs.security_alerts.length > 0 && (
            <div className="p-4">
              <p className="text-sm font-bold text-foreground">Security Alerts ({logs.security_alerts.length})</p>
              <div className="mt-2 space-y-1">
                {logs.security_alerts.slice(0, 10).map((a) => (
                  <div key={a.id} className="text-xs">
                    <span className={`font-mono ${a.severity === "critical" ? "text-rose-400" : "text-amber-400"}`}>
                      [{a.severity}]
                    </span>{" "}
                    <span className="text-foreground">{a.message}</span>
                    <span className="ml-2 text-foreground">{a.created_at.slice(0, 19).replace("T", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {logs.audit_events.length > 0 && (
            <div className="p-4">
              <p className="text-sm font-bold text-foreground">Recent Audit Events</p>
              <div className="mt-2 space-y-1">
                {logs.audit_events.slice(0, 10).map((e) => (
                  <div key={e.id} className="text-xs flex justify-between">
                    <span>
                      <span className="font-mono text-foreground">[{e.role}]</span> {e.action}
                    </span>
                    <span className="text-foreground">{e.created_at.slice(0, 19).replace("T", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {logs.worker_errors.length > 0 && (
            <div className="p-4">
              <p className="text-sm font-bold text-foreground">Worker Job Errors ({logs.worker_errors.length})</p>
              <div className="mt-2 space-y-1">
                {logs.worker_errors.map((e) => (
                  <div key={e.job_name} className="text-xs">
                    <span className="font-mono text-rose-400">{e.job_name}</span>{" "}
                    <span className="text-foreground">{e.last_error}</span>
                    <span className="ml-2 text-foreground">{e.last_run_at?.slice(0, 19).replace("T", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {logs.security_alerts.length === 0 && logs.audit_events.length === 0 && logs.worker_errors.length === 0 && (
            <div className="border rounded-lg p-6 text-center text-sm text-foreground bg-card">
              No recent log entries found.
            </div>
          )}
        </div>
      )}

      {tab === "workers" && (
        <div className="p-4">
          Worker job heartbeats: see{" "}
          <a href="/sysadmin/jobs" className="text-primary underline">
            /sysadmin/jobs
          </a>{" "}
          for the full dead-man&apos;s-switch view.
        </div>
      )}
    </div>
  );
}
