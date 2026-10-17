// Health — the tabbed sysadmin page body.
//
// Four tabs (app / database / infra / redis) selectable via the URL ?tab=.
//   app      → HeatStrip of the 24-hour error rate
//   database → two KPI numbers (active conns / pool slots) + last check
//   infra    → containers running vs. total
//   redis    → MiniGauge for worker health + queue depth

"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { HeatStrip, VIZ_THEME, statusColor } from "@/components/sysadmin/kit/viz";
import type { HeatCell } from "@/components/sysadmin/kit/viz";
import { MiniGauge } from "@/components/sysadmin/kit/sidebar";
import type { HealthData } from "@/components/sysadmin/domains/monitoring/types";

type TabId = "app" | "database" | "infra" | "redis";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "app", label: "App" },
  { id: "database", label: "Database" },
  { id: "infra", label: "Infra" },
  { id: "redis", label: "Redis" },
];

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

function AppSection({ data }: { data: HealthData["app"] }) {
  const hasData = data.errorRate24h.length > 0;
  const peak = hasData ? Math.max(...data.errorRate24h) : 0;
  const avg = hasData ? data.errorRate24h.reduce((a, b) => a + b, 0) / data.errorRate24h.length : 0;

  const cells: HeatCell[] = data.errorRate24h.map((v, i) => ({
    value: v,
    label: `${data.errorRate24h.length - 1 - i}h ago`,
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

function DatabaseSection({ data }: { data: HealthData["database"] }) {
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

function InfraSection({ data }: { data: HealthData["infra"] }) {
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

function RedisSection({ data }: { data: HealthData["redis"] }) {
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
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function HealthContent({ data, activeTab, onTabChange }: HealthContentProps) {
  const active = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div className="space-y-4">
      {/* tab strip */}
      <div
        role="tablist"
        className="flex gap-1 rounded-lg border p-1"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        {TABS.map((t) => {
          const isActive = t.id === active.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              )}
              style={{
                background: isActive ? "color-mix(in srgb, var(--action-primary) 12%, transparent)" : "transparent",
                color: isActive ? "var(--action-primary)" : "var(--text-muted)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* active section */}
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
      >
        {active.id === "app" && <AppSection data={data.app} />}
        {active.id === "database" && <DatabaseSection data={data.database} />}
        {active.id === "infra" && <InfraSection data={data.infra} />}
        {active.id === "redis" && <RedisSection data={data.redis} />}
      </div>
    </div>
  );
}

export { TABS };
