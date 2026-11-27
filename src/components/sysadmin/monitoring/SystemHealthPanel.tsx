"use client";

import { useCallback, useEffect, useState } from "react";
import { Timer, RefreshCw, Database, Container, Activity } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { RadialGaugeCard } from "@/components/sysadmin/kit/viz";

/**
 * SystemHealthPanel — host-level telemetry (CPU / RAM / disk / uptime) + the
 * scrape-target status, all from the confirmed `gate_prometheus` registry
 * queries. Shows explicit N/A / unavailable when a source is down — never a
 * fabricated value. Read-only; SysAdmin only (guarded by the parent page's
 * AuthGuard).
 */
interface SysHealth {
  cpu: number | null;
  mem: number | null;
  disk: number | null;
  load1: number | null;
  uptime: number | null;
  targetsUp: number;
  targetsTotal: number;
  pgUp: number | null;
  error: string | null;
  lastUpdated: Date | null;
}

function fmtUptime(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const gaugeStatus = (pct: number) => (pct >= 85 ? "error" : pct >= 60 ? "warn" : "ok");

export function SystemHealthPanel({ autoRefresh = true }: { autoRefresh?: boolean }) {
  const [data, setData] = useState<SysHealth>({
    cpu: null,
    mem: null,
    disk: null,
    load1: null,
    uptime: null,
    targetsUp: 0,
    targetsTotal: 0,
    pgUp: null,
    error: null,
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const q = (id: string) =>
        fetch(`/api/admin/monitoring?queryId=${id}`, { headers, cache: "no-store" }).then((r) => r.json());
      const [cpu, mem, disk, load1, uptime, targets, pgUp] = await Promise.all([
        q("host.cpu"),
        q("host.memory"),
        q("host.disk"),
        q("host.load1"),
        q("host.uptime"),
        q("targets.up"),
        q("pg.up"),
      ]);

      const scalar = (res: { data?: { result?: Array<{ value?: [number, string] }> } }): number | null => {
        const v = res?.data?.result?.[0]?.value?.[1];
        return v != null ? Number(v) : null;
      };

      const targetResults: Array<{ value?: [number, string] }> = targets?.data?.result || [];
      const upCount = targetResults.filter((t) => t.value?.[1] === "1").length;

      setData({
        cpu: scalar(cpu),
        mem: scalar(mem),
        disk: scalar(disk),
        load1: scalar(load1),
        uptime: scalar(uptime),
        targetsUp: upCount,
        targetsTotal: targetResults.length,
        pgUp: scalar(pgUp),
        error: cpu?.success ? null : "Monitoring stack unreachable",
        lastUpdated: new Date(),
      });
    } catch (err) {
      setData((d) => ({ ...d, error: err instanceof Error ? err.message : "Error" }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (!autoRefresh) return;
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load, autoRefresh]);

  const anyValue = data.cpu != null || data.mem != null || data.disk != null;

  return (
    <div className="rounded-xl border border-border bg-bg-surface">
      <div className="surface-card flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-action-success" />
            System Health
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            Host telemetry · Prometheus node exporter
            {data.lastUpdated ? ` · updated ${data.lastUpdated.toLocaleTimeString()}` : ""}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="surface-card inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-bg-elevated hover:bg-bg-base disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {data.error ? (
        <div className="surface-card p-4 m-4 bg-amber-500/10 text-action-warning text-xs flex items-center gap-2">
          <Activity className="w-4 h-4 shrink-0" />
          Monitoring stack unreachable — live host telemetry unavailable.{" "}
          {data.lastUpdated ? "Showing last cached values." : "No cached values yet."}
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
        <RadialGaugeCard
          title="CPU"
          value={data.cpu != null ? Math.round(data.cpu) : null}
          status={data.cpu != null ? gaugeStatus(data.cpu) : "neutral"}
          unit="%"
          meta="node_exporter"
          size={96}
        />
        <RadialGaugeCard
          title="Memory"
          value={data.mem != null ? Math.round(data.mem) : null}
          status={data.mem != null ? gaugeStatus(data.mem) : "neutral"}
          unit="%"
          meta="node_exporter"
          size={96}
        />
        <RadialGaugeCard
          title="Disk (/)"
          value={data.disk != null ? Math.round(data.disk) : null}
          status={data.disk != null ? gaugeStatus(data.disk) : "neutral"}
          unit="%"
          meta="node_exporter"
          size={96}
        />
        <div className="rounded-xl border border-border bg-bg-elevated/40 p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted">
            <Timer className="size-3.5" /> Uptime
          </div>
          <div className="text-lg font-bold text-text-primary">{fmtUptime(data.uptime)}</div>
          <div className="text-[11px] text-text-muted">
            Load (1m): <span className="font-mono text-text-primary">{data.load1 != null ? data.load1.toFixed(2) : "—"}</span>
          </div>
        </div>
      </div>

      {/* Scrape target / dependency status — explicit, not fabricated */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <StatusPill
            icon={<Database className="size-3.5" />}
            label="PostgreSQL exporter"
            ok={data.pgUp === 1}
            unknown={data.pgUp == null}
          />
          <StatusPill
            icon={<Container className="size-3.5" />}
            label="Scrape targets up"
            ok={data.targetsTotal > 0 && data.targetsUp === data.targetsTotal}
            unknown={data.targetsTotal === 0}
            sub={data.targetsTotal > 0 ? `${data.targetsUp}/${data.targetsTotal}` : undefined}
          />
          <StatusPill
            icon={<Activity className="size-3.5" />}
            label="Host telemetry"
            ok={anyValue}
            unknown={!anyValue && !data.error}
          />
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  icon,
  label,
  ok,
  unknown,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  ok: boolean;
  unknown?: boolean;
  sub?: string;
}) {
  const tone = unknown
    ? "border-border text-text-muted"
    : ok
      ? "border-emerald-500/30 bg-emerald-500/10 text-action-success"
      : "border-rose-500/30 bg-rose-500/10 text-action-danger";
  return (
    <div className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${tone}`}>
      <span className="shrink-0">{icon}</span>
      <span className="font-medium flex-1">{label}</span>
      <span className="font-mono text-[11px]">
        {sub ?? (unknown ? "n/a" : ok ? "ok" : "down")}
      </span>
    </div>
  );
}
