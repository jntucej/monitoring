"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Search, Terminal, Activity } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { TelemetryKpiCard, UnifiedWorkspaceFrame } from "@/components/dashboard/UnifiedDashboardWidgets";

interface LokiLogEntry {
  ts: string;
  container: string;
  level: string;
  line: string;
}

interface LokiResponse {
  source: "loki" | "db-fallback";
  lokiReachable: boolean;
  lokiError?: string;
  grafanaUrl: string;
  containers: string[];
  entries: LokiLogEntry[];
  collectedAt: string;
}

interface StackMetrics {
  hostCpu: number | null;
  hostMem: number | null;
  hostDisk: number | null;
  hostLoad: number | null;
  pgUp: boolean | null;
  pgConns: number | null;
  targetsUp: number;
  targetsTotal: number;
}

export function ObservabilityStackPanel() {
  const [metrics, setMetrics] = useState<StackMetrics>({
    hostCpu: null,
    hostMem: null,
    hostDisk: null,
    hostLoad: null,
    pgUp: null,
    pgConns: null,
    targetsUp: 0,
    targetsTotal: 0,
  });
  const [logs, setLogs] = useState<LokiResponse | null>(null);
  const [container, setContainer] = useState("all");
  const [search, setSearch] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const headers = getAuthHeaders();
    const q = (id: string) =>
      fetch(`/api/admin/monitoring?queryId=${id}`, { headers, cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);

    const params = new URLSearchParams({
      container,
      minutes: String(minutes),
      limit: "200",
    });
    if (search.trim()) params.set("search", search.trim());

    const [cpu, mem, disk, load1, pgUp, pgConns, targets, lokiRes] = await Promise.all([
      q("host.cpu"),
      q("host.memory"),
      q("host.disk"),
      q("host.load1"),
      q("pg.up"),
      q("pg.connections"),
      q("targets.up"),
      fetch(`/api/sysadmin/loki-logs?${params.toString()}`, { headers, cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null),
    ]);

    const scalar = (res: any): number | null => {
      const v = res?.data?.result?.[0]?.value?.[1];
      return v != null ? Number(v) : null;
    };

    const targetResults: Array<{ value?: [number, string] }> = targets?.data?.result || [];
    const upCount = targetResults.filter((t) => t.value?.[1] === "1").length;

    setMetrics({
      hostCpu: scalar(cpu),
      hostMem: scalar(mem),
      hostDisk: scalar(disk),
      hostLoad: scalar(load1),
      pgUp: scalar(pgUp) === 1 ? true : scalar(pgUp) === 0 ? false : null,
      pgConns: scalar(pgConns),
      targetsUp: upCount,
      targetsTotal: targetResults.length,
    });

    if (lokiRes?.success && lokiRes.data) {
      setLogs(lokiRes.data);
    }
    setLoading(false);
  }, [container, minutes, search]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => void fetchAll(), 10_000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchAll]);

  const grafanaUrl = logs?.grafanaUrl || "http://100.122.7.62:3001";

  return (
    <UnifiedWorkspaceFrame className="p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#111111] text-white flex items-center justify-center shadow-sm">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900">
              Observability Stack & Live Container Logs
            </h2>
            <p className="text-xs text-neutral-500">
              Grafana 11.5.1 · Prometheus · Loki 3.4.1 · node_exporter · postgres_exporter · cAdvisor
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 text-xs font-medium text-neutral-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-neutral-900"
            />
            Live 10s
          </label>
          <button
            type="button"
            onClick={() => void fetchAll()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-neutral-200/80 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <a
            href={grafanaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#111111] text-white text-xs font-semibold hover:bg-neutral-800"
          >
            Open Grafana 11.5.1
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 4-Card Telemetry Strip (node_exporter, postgres_exporter, Prometheus, Loki) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <TelemetryKpiCard
          label="Host CPU & Load (node_exporter)"
          value={metrics.hostCpu != null ? `${metrics.hostCpu.toFixed(1)}%` : "—"}
          delta={metrics.hostLoad != null ? `load ${metrics.hostLoad.toFixed(2)}` : "probing"}
          sub={metrics.hostDisk != null ? `Disk ${metrics.hostDisk.toFixed(0)}% used` : "Host metrics"}
          tone={metrics.hostCpu != null && metrics.hostCpu > 85 ? "rose" : "emerald"}
          segments={metrics.hostCpu != null ? Math.max(1, Math.min(4, Math.ceil(metrics.hostCpu / 25))) : 2}
        />
        <TelemetryKpiCard
          label="Host Memory (node_exporter)"
          value={metrics.hostMem != null ? `${metrics.hostMem.toFixed(1)}%` : "—"}
          delta={metrics.hostMem != null && metrics.hostMem > 85 ? "high" : "healthy"}
          sub="RAM utilization"
          tone={metrics.hostMem != null && metrics.hostMem > 85 ? "amber" : "indigo"}
          segments={metrics.hostMem != null ? Math.max(1, Math.min(4, Math.ceil(metrics.hostMem / 25))) : 2}
        />
        <TelemetryKpiCard
          label="PostgreSQL (postgres_exporter)"
          value={metrics.pgConns != null ? `${metrics.pgConns} conns` : metrics.pgUp ? "UP" : "—"}
          delta={metrics.pgUp === true ? "pg_up=1" : metrics.pgUp === false ? "DOWN" : "probing"}
          sub="PG17 exporter"
          tone={metrics.pgUp === false ? "rose" : "emerald"}
          segments={metrics.pgUp === false ? 1 : 4}
        />
        <TelemetryKpiCard
          label="Prometheus & Loki 3.4.1"
          value={`${metrics.targetsUp}/${metrics.targetsTotal || "—"} up`}
          delta={logs?.lokiReachable ? "Loki live" : "DB fallback"}
          sub={`${logs?.entries.length ?? 0} log lines loaded`}
          tone={logs?.lokiReachable ? "emerald" : "amber"}
          segments={logs?.lokiReachable ? 4 : 2}
        />
      </div>

      {/* Live Container Log Explorer */}
      <div className="rounded-2xl border border-neutral-200/80 bg-[#FAFAFB] overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200/80 bg-white flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-neutral-700" />
            <span className="text-xs font-bold text-neutral-900">
              Running Container Logs ({logs?.source === "loki" ? "Loki 3.4.1" : "Audit/Worker Fallback"})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={container}
              onChange={(e) => setContainer(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-medium text-neutral-800"
            >
              <option value="all">All Containers</option>
              {(logs?.containers || []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-medium text-neutral-800"
            >
              <option value={15}>Last 15m</option>
              <option value={60}>Last 1h</option>
              <option value={360}>Last 6h</option>
              <option value={1440}>Last 24h</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter logs..."
                className="pl-8 pr-3 py-1.5 w-44 sm:w-56 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-800 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>
        </div>

        {!logs?.lokiReachable && logs?.lokiError && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200/80 text-[11px] text-amber-800">
            Loki upstream ({logs.lokiError}) — showing DB audit/security/worker logs. Attach{" "}
            <code className="font-mono">gate_web</code> to{" "}
            <code className="font-mono">server-monitoring_mon-net</code> to stream all Docker container logs from Loki 3.4.1.
          </div>
        )}

        <div className="max-h-[380px] overflow-y-auto bg-neutral-950 text-neutral-200 font-mono text-[11px] divide-y divide-neutral-800/70">
          {!logs || logs.entries.length === 0 ? (
            <div className="p-6 text-center text-neutral-400">
              {loading ? "Loading live logs..." : "No log entries matched the current filter."}
            </div>
          ) : (
            logs.entries.map((entry, idx) => {
              const lvlCls =
                entry.level === "error"
                  ? "text-rose-400"
                  : entry.level === "warn"
                  ? "text-amber-300"
                  : "text-emerald-400";
              return (
                <div key={idx} className="px-3.5 py-1.5 flex items-start gap-2.5 hover:bg-neutral-900/80">
                  <span className="text-neutral-500 shrink-0">
                    {new Date(entry.ts).toLocaleTimeString([], { hour12: false })}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 shrink-0 max-w-[150px] truncate">
                    {entry.container}
                  </span>
                  <span className={`uppercase font-bold shrink-0 w-10 ${lvlCls}`}>
                    {entry.level}
                  </span>
                  <span className="text-neutral-100 break-all">{entry.line}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </UnifiedWorkspaceFrame>
  );
}
