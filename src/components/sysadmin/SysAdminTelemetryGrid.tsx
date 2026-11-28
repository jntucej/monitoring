"use client";

import React from "react";
import { useApiResource } from "@/hooks/useApiResource";
import {
  Server,
  Database,
  Box,
  Cpu,
  MemoryStick,
  Network,
  Activity,
  CircleCheck,
  CircleX,
  Clock,
  ScrollText,
  RefreshCw,
} from "lucide-react";

/**
 * SysAdminTelemetryGrid — a clean DevOps telemetry grid for /sysadmin.
 * Segmented KPI strip + CPU/RAM/Bandwidth radial gauges + a live filterable
 * job/agent log + connected-service toggles. The Botrix reference's prototype
 * top pill nav and hardcoded Singapore/NY nodes are stripped; this is a
 * props-only workspace that the page feeds from the real sysadmin APIs.
 *
 * All sub-data is defensive: a missing/failed slice degrades to an explicit
 * "no data" state instead of blanking the grid.
 */

export interface TelemetryService {
  name: string;
  status: "up" | "down" | "unknown";
  cpu?: number; // 0-100
  mem?: number; // 0-100
  restarts?: number;
}
export interface TelemetryDbHealth {
  healthy: boolean;
  version?: string;
  connections?: number;
  maxConnections?: number;
  latencyMs?: number;
}
export interface TelemetryWorker {
  status: "up" | "down" | "idle" | "unknown";
  heartbeatAgeSec?: number;
  queueDepth?: number;
}
export interface TelemetryJobRow {
  id: string;
  name: string;
  status: string;
  lastRunAt?: string;
  nextRunAt?: string;
  lastStatus?: string;
}

interface Props {
  services: TelemetryService[];
  dbHealth: TelemetryDbHealth | null;
  worker: TelemetryWorker | null;
  jobs: TelemetryJobRow[];
  onToggle?: (name: string) => void;
}

function gaugePct(v?: number): number {
  if (v === undefined || Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function RadialGauge({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "ok" | "warn" | "crit" | "neutral";
}) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color =
    tone === "crit" ? "stroke-rose-500" : tone === "warn" ? "stroke-amber-500" : tone === "ok" ? "stroke-emerald-500" : "stroke-slate-400";
  const text =
    tone === "crit" ? "text-rose-600" : tone === "warn" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
          <circle cx="32" cy="32" r={r} className="stroke-slate-200" strokeWidth="6" fill="none" />
          <circle
            cx="32"
            cy="32"
            r={r}
            className={color}
            strokeWidth="6"
            fill="none"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.4s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-4 w-4 text-slate-500" />
        </div>
      </div>
      <div className="text-xs font-bold text-slate-900 tabular-nums">
        {value}
        <span className="text-slate-400">%</span>
      </div>
      <div className={`text-[11px] font-semibold ${text}`}>{label}</div>
    </div>
  );
}

function toneFor(pct: number): "ok" | "warn" | "crit" | "neutral" {
  if (pct >= 85) return "crit";
  if (pct >= 65) return "warn";
  return "ok";
}

export function SysAdminTelemetryGrid({ services, dbHealth, worker, jobs, onToggle }: Props) {
  const [filter, setFilter] = React.useState("");
  const up = services.filter((s) => s.status === "up").length;
  const down = services.filter((s) => s.status === "down").length;
  const unknown = services.length - up - down;

  const avgCpu =
    services.length > 0
      ? Math.round(services.reduce((a, s) => a + gaugePct(s.cpu), 0) / services.length)
      : 0;
  const avgMem =
    services.length > 0
      ? Math.round(services.reduce((a, s) => a + gaugePct(s.mem), 0) / services.length)
      : 0;
  // Bandwidth proxy from DB latency (lower latency = healthier throughput).
  const bwProxy = dbHealth?.latencyMs !== undefined ? Math.max(0, 100 - Math.round(dbHealth.latencyMs / 2)) : 0;

  const visibleJobs = React.useMemo(() => {
    if (!filter.trim()) return jobs;
    const f = filter.toLowerCase();
    return jobs.filter(
      (j) => j.name.toLowerCase().includes(f) || j.status.toLowerCase().includes(f),
    );
  }, [jobs, filter]);

  return (
    <div className="space-y-4">
      {/* Segmented KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-300">
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <Box className="h-3.5 w-3.5" /> Services
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {up}
            <span className="text-sm text-slate-400">/{services.length}</span>
          </div>
          <div className="text-[11px] font-medium text-slate-600 mt-0.5">
            {down > 0 ? `${down} down` : "all up"} · {unknown} unknown
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-300">
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" /> Postgres
          </div>
          <div className={`text-lg font-bold mt-1 ${dbHealth?.healthy ? "text-emerald-700" : "text-rose-700"}`}>
            {dbHealth ? (dbHealth.healthy ? "Healthy" : "Degraded") : "No data"}
          </div>
          <div className="text-[11px] font-medium text-slate-600 mt-0.5">
            {dbHealth?.version ? `v${dbHealth.version} · ` : ""}
            {dbHealth?.connections !== undefined
              ? `${dbHealth.connections}/${dbHealth.maxConnections ?? "?"} conns`
              : "—"}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-300">
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Worker
          </div>
          <div className={`text-lg font-bold mt-1 ${worker?.status === "up" ? "text-emerald-700" : worker?.status === "down" ? "text-rose-700" : "text-slate-700"}`}>
            {worker ? worker.status : "No data"}
          </div>
          <div className="text-[11px] font-medium text-slate-600 mt-0.5">
            {worker?.queueDepth !== undefined ? `queue ${worker.queueDepth}` : ""}
            {worker?.heartbeatAgeSec !== undefined ? ` · heartbeat ${Math.round(worker.heartbeatAgeSec)}s ago` : ""}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl bg-white border border-slate-300">
          <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
            <ScrollText className="h-3.5 w-3.5" /> Jobs
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{jobs.length}</div>
          <div className="text-[11px] font-medium text-slate-600 mt-0.5">registered</div>
        </div>
      </div>

      {/* Radial gauges + connected-service toggles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-300">
          <div className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5" /> Resource Gauges
          </div>
          <div className="grid grid-cols-3 gap-2">
            <RadialGauge label="CPU (avg)" value={avgCpu} icon={Cpu} tone={toneFor(avgCpu)} />
            <RadialGauge label="RAM (avg)" value={avgMem} icon={MemoryStick} tone={toneFor(avgMem)} />
            <RadialGauge label="Throughput" value={bwProxy} icon={Network} tone={toneFor(bwProxy)} />
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-300">
          <div className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5" /> Connected Services
          </div>
          {services.length === 0 ? (
            <div className="text-xs text-slate-500 py-3">No service telemetry.</div>
          ) : (
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {services.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {s.status === "up" ? (
                      <CircleCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    ) : s.status === "down" ? (
                      <CircleX className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-slate-900 truncate">{s.name}</span>
                    {s.restarts !== undefined && s.restarts > 0 && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1">
                        {s.restarts} restarts
                      </span>
                    )}
                  </div>
                  {onToggle && (
                    <button
                      type="button"
                      onClick={() => onToggle(s.name)}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 shrink-0"
                    >
                      Toggle
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live filterable job / agent log */}
      <div className="rounded-2xl bg-white border border-slate-300 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <ScrollText className="h-3.5 w-3.5" /> Job &amp; Agent Log
          </h3>
          <div className="flex items-center gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name / status"
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11px] w-40"
            />
            <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
        {visibleJobs.length === 0 ? (
          <div className="p-4 text-xs text-slate-500">No jobs match.</div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {visibleJobs.map((j) => (
              <div key={j.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">{j.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {j.lastRunAt ? `last ${new Date(j.lastRunAt).toLocaleString()}` : "never run"}
                    {j.nextRunAt ? ` · next ${new Date(j.nextRunAt).toLocaleString()}` : ""}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    j.status === "running"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : j.status === "failed" || j.lastStatus === "failed"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-slate-100 text-slate-700 border border-slate-300"
                  }`}
                >
                  {j.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page-level data adapter: fetch the 4 real sysadmin endpoints and   */
/*  map them into the grid's defensive prop shape. Use this in the     */
/*  page so the grid itself stays pure.                                */
/* ------------------------------------------------------------------ */
export function useSysAdminTelemetry() {
  const { data: svcRes } = useApiResource<Record<string, unknown>>("/api/sysadmin/services");
  const { data: dbRes } = useApiResource<Record<string, unknown>>("/api/sysadmin/database-health");
  const { data: wrkRes } = useApiResource<Record<string, unknown>>("/api/sysadmin/redis-worker");
  const { data: jobsRes } = useApiResource<Record<string, unknown>>("/api/sysadmin/worker-jobs");

  const services: TelemetryService[] = React.useMemo(() => {
    const raw = (svcRes?.data as Record<string, unknown>) ?? svcRes;
    const list =
      (raw?.services as Array<Record<string, unknown>>) ??
      (Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : []);
    return list.map((s) => ({
      name: String(s.name ?? s.service ?? "unknown"),
      status: (String(s.status ?? s.state ?? "unknown") as TelemetryService["status"]),
      cpu: s.cpu !== undefined ? Number(s.cpu) : undefined,
      mem: s.mem !== undefined ? Number(s.mem) : undefined,
      restarts: s.restarts !== undefined ? Number(s.restarts) : undefined,
    }));
  }, [svcRes]);

  const dbHealth: TelemetryDbHealth | null = React.useMemo(() => {
    const raw = (dbRes?.data as Record<string, unknown>) ?? dbRes;
    if (!raw || typeof raw !== "object") return null;
    const h = raw.health ?? raw;
    return {
      healthy: Boolean((h as Record<string, unknown>)?.healthy ?? (h as Record<string, unknown>)?.ok),
      version: ((h as Record<string, unknown>)?.version as string | undefined),
      connections: ((h as Record<string, unknown>)?.connections as number | undefined),
      maxConnections: ((h as Record<string, unknown>)?.maxConnections as number | undefined),
      latencyMs: ((h as Record<string, unknown>)?.latencyMs as number | undefined),
    };
  }, [dbRes]);

  const worker: TelemetryWorker | null = React.useMemo(() => {
    const raw = (wrkRes?.data as Record<string, unknown>) ?? wrkRes;
    if (!raw || typeof raw !== "object") return null;
    return {
      status: (String((raw as Record<string, unknown>).status ?? "unknown") as TelemetryWorker["status"]),
      heartbeatAgeSec: ((raw as Record<string, unknown>).heartbeatAgeSec as number | undefined),
      queueDepth: ((raw as Record<string, unknown>).queueDepth as number | undefined),
    };
  }, [wrkRes]);

  const jobs: TelemetryJobRow[] = React.useMemo(() => {
    const raw = (jobsRes?.data as Record<string, unknown>) ?? jobsRes;
    const list =
      (raw?.jobs as Array<Record<string, unknown>>) ??
      (Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : []);
    return list.map((j, i) => ({
      id: String(j.id ?? j.job ?? i),
      name: String(j.name ?? j.job ?? j.jobName ?? "job"),
      status: String(j.status ?? j.state ?? "idle"),
      lastRunAt: (j.lastRunAt as string | undefined) ?? (j.lastRun as string | undefined),
      nextRunAt: (j.nextRunAt as string | undefined) ?? (j.nextRun as string | undefined),
      lastStatus: j.lastStatus as string | undefined,
    }));
  }, [jobsRes]);

  return { services, dbHealth, worker, jobs };
}
