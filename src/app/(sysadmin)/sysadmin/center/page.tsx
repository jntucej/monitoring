"use client";

import { useCallback, useEffect, useState } from "react";

interface CenterData {
  collected_at: string;
  infrastructure: {
    hostname: string;
    uptime_seconds: number;
    load_avg: number[];
    cpu_count: number;
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
    security_alerts: { id: string; alert_type: string; severity: string; status: string; message: string }[];
  };
  security: { failed_logins_24h: number; open_alerts: number };
  monitoring: { prometheus: { ok: boolean; latency_ms: number }; grafana_url: string };
}

type TabKey = "overview" | "database" | "backups" | "workers" | "logs" | "monitoring";

export default function SysadminCenterPage() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [data, setData] = useState<CenterData | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/sysadmin/center")
      .then((r) => r.json())
      .then((j) => {
        if (j?.data) setData(j.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(action: string) {
    const r = await fetch("/api/sysadmin/center", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const j = await r.json();
    if (j?.data) {
      setActionMsg(`${action}: ${JSON.stringify(j.data.result)}`);
      load();
    }
  }

  if (!data) return <div className="p-6 text-sm text-foreground">Loading System Administration Center...</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">System Administration Center</h1>
          <p className="text-xs text-muted-foreground">
            Host: {data.infrastructure.hostname} • Updated: {data.collected_at.slice(0, 19).replace("T", " ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["overview", "database", "backups", "workers", "logs", "monitoring"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`px-3 py-1 text-xs font-semibold uppercase ${
                tab === k ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {actionMsg && <div className="text-xs text-primary">{actionMsg}</div>}

      {tab === "overview" && (
        <div className="space-y-3 text-xs text-foreground">
          <div>
            Uptime: {Math.round(data.infrastructure.uptime_seconds / 3600)}h • CPUs: {data.infrastructure.cpu_count} •
            Load: {data.infrastructure.load_avg.map((n) => n.toFixed(2)).join(", ")} • Memory:{" "}
            {data.infrastructure.memory_used_pct}%
          </div>
          <div>
            Security (24h): Failed Logins: {data.security.failed_logins_24h} • Open Alerts: {data.security.open_alerts}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => runAction("retry_failed_notifications")}
              className="bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
            >
              Retry Failed Notifications
            </button>
            <button
              type="button"
              onClick={() => runAction("verify_latest_backup")}
              className="px-3 py-1 text-xs text-foreground underline"
            >
              Verify Backup Directory
            </button>
          </div>
        </div>
      )}

      {tab === "database" && (
        <div className="space-y-2 text-xs text-foreground">
          <div>
            PostgreSQL: {data.database.available ? "ONLINE" : "OFFLINE"} • Size:{" "}
            {Math.round(data.database.size_bytes / (1024 * 1024))} MB • Connections:{" "}
            {data.database.connections.active} active / {data.database.connections.total} total • Locks:{" "}
            {data.database.locks_count}
          </div>
          <div className="space-y-1">
            {data.database.top_tables.map((t) => (
              <div key={t.relname} className="flex justify-between py-1">
                <span>{t.relname}</span>
                <span className="font-mono">{t.n_live_tup} rows</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "backups" && (
        <div className="space-y-1 text-xs text-foreground">
          {data.backups.map((b) => (
            <div key={b.name} className="flex justify-between py-1">
              <span>{b.name}</span>
              <span className="font-mono">
                {Math.round(b.size_bytes / 1024)} KB • {b.age_hours}h ago
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "workers" && (
        <div className="space-y-1 text-xs text-foreground">
          {data.workers.scheduled_jobs.map((j) => (
            <div key={j.job_name} className="flex justify-between py-1">
              <span>{j.job_name}</span>
              <span className="font-mono">
                {j.last_status ?? "unknown"} ({j.last_duration_ms ?? 0}ms)
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "logs" && (
        <div className="space-y-1 text-xs text-foreground">
          {data.logs.audit_events.map((a) => (
            <div key={a.id} className="flex justify-between py-1">
              <span>
                [{a.role}] {a.action}
              </span>
              <span className="text-muted-foreground">{a.created_at.slice(0, 19).replace("T", " ")}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "monitoring" && (
        <div className="space-y-2 text-xs text-foreground">
          <div>
            Prometheus: {data.monitoring.prometheus.ok ? "HEALTHY" : "UNREACHABLE"} (
            {data.monitoring.prometheus.latency_ms}ms)
          </div>
          <div>Grafana: {data.monitoring.grafana_url}</div>
        </div>
      )}
    </div>
  );
}
