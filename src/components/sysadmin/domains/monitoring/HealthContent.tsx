// Health — the tabbed sysadmin page body.
//
// Four tabs (app / database / infra / redis) selectable via the URL ?tab=.
//   app      → HeatStrip of the 24-hour error rate
//   database → two KPI numbers (active conns / pool slots) + last check
//   infra    → containers running vs. total
//   redis    → MiniGauge for worker health + queue depth

"use client";

import type { ReactNode } from "react";
import { HeatStrip, VIZ_THEME, statusColor } from "@/components/sysadmin/kit/viz";
import type { HeatCell } from "@/components/sysadmin/kit/viz";
import { MiniGauge } from "@/components/sysadmin/kit/sidebar";
import type { HealthData } from "@/components/sysadmin/domains/monitoring/types";

export type TabId = "app" | "database" | "infra" | "redis";

// ── section helpers ──────────────────────────────────────────────────────────

function KpiNumber({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div
      className="rounded-lg border p-3 bg-[var(--bg-surface)]"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="text-[11px] uppercase tracking-wide" style={{ color: VIZ_THEME.muted }}>{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: VIZ_THEME.text }}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs" style={{ color: VIZ_THEME.muted }}>{hint}</p>}
    </div>
  );
}

function AppSection({ data }: { data: HealthData["app"] | null | undefined }) {
  const rate = data?.errorRate24h;
  const hasData = rate ? rate.length > 0 : false;
  const peak = hasData ? Math.max(...rate!) : 0;
  const avg = hasData ? rate!.reduce((a, b) => a + b, 0) / rate!.length : 0;

  const cells: HeatCell[] = (rate ?? []).map((v, i) => ({
    value: v,
    label: `${(rate?.length ?? 0) - 1 - i}h ago`,
    status: v > 0.05 ? "error" : v > 0.02 ? "warn" : "ok",
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold" style={{ color: VIZ_THEME.text }}>
          API error rate (24h)
        </h3>
        <span className="text-xs font-medium" style={{ color: statusColor(peak > 0.05 ? "error" : avg > 0.02 ? "warn" : "ok") }}>
          peak {(peak * 100).toFixed(1)}%
        </span>
      </div>
      {hasData ? (
        <HeatStrip cells={cells} maxCells={24} height={28} label="Per-hour error rate" />
      ) : (
        <p className="text-xs py-4" style={{ color: VIZ_THEME.muted }}>
          No API metrics yet.
        </p>
      )}
      <p className="text-xs" style={{ color: VIZ_THEME.muted }}>
        Averaged error rate over the past 24h: {(avg * 100).toFixed(2)}%
      </p>
    </div>
  );
}

function DatabaseSection({ data }: { data: HealthData["database"] | null | undefined }) {
  if (!data) return <p className="text-xs py-4" style={{ color: VIZ_THEME.muted }}>No database metrics.</p>;
  const lastCheckLabel = data.last_check
    ? new Date(data.last_check).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <KpiNumber label="Active connections" value={data.conns} />
        <KpiNumber label="Pool slots" value={data.pool} />
      </div>
      <p className="text-xs" style={{ color: VIZ_THEME.muted }}>Last check: {lastCheckLabel}</p>
    </div>
  );
}

function InfraSection({ data }: { data: HealthData["infra"] | null | undefined }) {
  if (!data) return <p className="text-xs py-4" style={{ color: VIZ_THEME.muted }}>No container metrics.</p>;
  const allRunning = data.containers > 0 && data.running === data.containers;
  const gaugeValue = data.containers > 0 ? data.running / data.containers : 0;
  const gaugeColor = allRunning
    ? "var(--action-primary)"
    : data.running > 0
      ? "var(--action-warning)"
      : "var(--action-danger)";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <MiniGauge value={gaugeValue} label="Containers running" color={gaugeColor} size={44} />
        <div>
          <p className="text-[11px] uppercase tracking-wide" style={{ color: VIZ_THEME.muted }}>Containers</p>
          <p className="text-xl font-semibold tabular-nums" style={{ color: VIZ_THEME.text }}>
            {data.running}
            <span className="ml-1 text-sm font-normal" style={{ color: VIZ_THEME.muted }}>
              / {data.containers} running
            </span>
          </p>
        </div>
      </div>
      {data.containers === 0 && (
        <p className="text-xs" style={{ color: VIZ_THEME.muted }}>
          No containers reported yet.
        </p>
      )}
    </div>
  );
}

function RedisSection({ data }: { data: HealthData["redis"] | null | undefined }) {
  if (!data) return <p className="text-xs py-4" style={{ color: VIZ_THEME.muted }}>No worker metrics.</p>;
  // Gauge = worker healthy? 1 : fill based on queue headroom (1 - depth/1000).
  const value = data.worker_healthy ? 1 : Math.max(0, 1 - data.queue_depth / 1000);
  const color = data.worker_healthy ? "var(--action-primary)" : "var(--action-danger)";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <MiniGauge value={value} label={data.worker_healthy ? "Worker healthy" : "Worker degraded"} color={color} size={44} />
        <div>
          <p className="text-[11px] uppercase tracking-wide" style={{ color: VIZ_THEME.muted }}>Worker</p>
          <p className="text-xl font-semibold tabular-nums" style={{ color }}>
            {data.worker_healthy ? "Healthy" : "Degraded"}
          </p>
        </div>
      </div>
      <KpiNumber label="Queue depth" value={data.queue_depth} />
    </div>
  );
}

// ── main export ──────────────────────────────────────────────────────────────

export interface HealthContentProps {
  data: HealthData;
  activeTab?: TabId;
  tab?: TabId;
  onTabChange?: (tab: TabId) => void;
}

export function HealthContent({ data, activeTab, tab }: HealthContentProps) {
  const currentView = tab ?? activeTab ?? "app";

  return (
    <div className="space-y-4">
      {/* active section */}
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        {currentView === "app" && <AppSection data={data.app} />}
        {currentView === "database" && <DatabaseSection data={data.database} />}
        {currentView === "infra" && <InfraSection data={data.infra} />}
        {currentView === "redis" && <RedisSection data={data.redis} />}
      </div>
    </div>
  );
}
