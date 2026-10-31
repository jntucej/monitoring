// Jobs — the cards sysadmin page body.
//
// Renders:
//   1. Four KPI tiles (healthy % / failed 24h / avg duration / DLQ)
//   2. A run-count HeatMatrix (jobs × days) — the signature visual, with cells
//      colored green / amber / red based on 0 / 1 / 2+ runs per day

"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { VIZ_THEME, statusColor, heatColor, clamp01 } from "@/components/sysadmin/kit/viz";
import type { JobsData } from "@/components/sysadmin/domains/automation/types";

// ── KPI tile ──────────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "ok" | "warn" | "danger" | "info";
}) {
  const color =
    tone === "ok"
      ? "var(--action-primary)"
      : tone === "warn"
        ? "var(--action-warning)"
        : tone === "danger"
          ? "var(--action-danger)"
          : tone === "info"
            ? "var(--action-info)"
            : "var(--text-primary)";
  return (
    <div
      className={cn(
        "rounded-lg border p-3 bg-[var(--bg-surface)]",
      )}
      style={{ borderColor: "var(--border)" }}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: VIZ_THEME.muted }}>
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-semibold tabular-nums" style={{ color }}>{value}</span>
        {hint && <span className="text-xs" style={{ color: VIZ_THEME.muted }}>{hint}</span>}
      </div>
    </div>
  );
}

// ── run-count cell coloring (green / amber / red by 0 / 1 / 2+) ─────────────

function cellFill(value: number, max: number): string {
  // 0 runs → empty (neutral); 1 → amber; 2+ → green. Intensity scales with count.
  if (value <= 0) return "transparent";
  if (value === 1) return heatColor(0.5, "warn");
  return heatColor(max > 0 ? clamp01(0.5 + 0.5 * (value / max)) : 1, "ok");
}

function RunsMatrix({ data }: { data: JobsData["runs_matrix"] }) {
  const max = data.data.reduce((m, row) => Math.max(m, ...row), 0);
  return (
    <div>
      <div
        role="img"
        aria-label={`Job run matrix, ${data.rows.length} jobs by ${data.cols.length} days`}
        className="grid gap-px"
        style={{
          gridTemplateColumns: `minmax(120px, auto) repeat(${data.cols.length}, minmax(0, 16px))`,
        }}
      >
        {/* top-left corner */}
        <div />
        {/* column headers */}
        {data.cols.map((col, i) => (
          <div key={i} className="truncate pb-1 text-center text-[9px]" style={{ color: VIZ_THEME.muted }} title={col}>
            {col}
          </div>
        ))}
        {data.rows.map((rowLabel, ri) => {
          const row = data.data[ri] ?? [];
          return (
            <div key={rowLabel} style={{ display: "contents" }}>
              <div
                className="flex items-center truncate pr-2 text-[11px]"
                style={{ color: VIZ_THEME.text, width: 120 }}
                title={rowLabel}
              >
                {rowLabel}
              </div>
              {data.cols.map((col, ci) => {
                const value = row[ci];
                const missing = value == null || value < 0;
                return (
                  <div
                    key={ci}
                    title={`${rowLabel} · ${col}: ${missing ? "no data" : `${value} run(s)`}`}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      background: missing ? "rgba(0,0,0,0)" : cellFill(value, max),
                      border: "1px solid var(--border)",
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── main export ──────────────────────────────────────────────────────────────

export interface JobsContentProps {
  data?: JobsData | null;
}

export function JobsContent({ data }: JobsContentProps) {
  if (!data) {
    return (
      <div className="rounded-lg border p-4 text-sm text-[var(--text-muted)]">
        No job data available.
      </div>
    );
  }
  const { healthy_pct, failed_24h, avg_duration_ms, dlq, runs_matrix } = data;

  const healthyTone = healthy_pct >= 90 ? "ok" : healthy_pct >= 70 ? "warn" : "danger";
  const failedTone = failed_24h > 0 ? "danger" : "ok";

  // Format avg duration.
  const fmtDuration = (ms: number) => {
    if (ms <= 0) return "—";
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };

  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Healthy" value={`${healthy_pct}%`} tone={healthyTone} hint="of last 14d" />
        <KpiTile
          label="Failed 24h"
          value={failed_24h}
          tone={failedTone}
          hint={failed_24h > 0 ? "in last day" : "all clear"}
        />
        <KpiTile label="Avg duration" value={fmtDuration(avg_duration_ms)} />
        <KpiTile label="DLQ" value={dlq} tone={dlq > 0 ? "warn" : "ok"} />
      </div>

      {/* Signature visual: runs matrix (jobs × days) */}
      <div
        className="rounded-lg border p-4 bg-[var(--bg-surface)]"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: VIZ_THEME.text }}>
            Run matrix
          </p>
          <div className="flex items-center gap-3 text-[10px]" style={{ color: VIZ_THEME.muted }}>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: statusColor("ok") }} /> 2+ runs
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: statusColor("warn") }} /> 1 run
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: "transparent", border: "1px solid var(--border)" }} /> none
            </span>
          </div>
        </div>
        {runs_matrix.rows.length === 0 ? (
          <p className="text-xs py-4" style={{ color: VIZ_THEME.muted }}>
            No scheduled jobs recorded.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <RunsMatrix data={runs_matrix} />
            <p className="mt-2 text-[10px]" style={{ color: VIZ_THEME.muted }}>
              Green = 2+ runs · amber = 1 run · empty = no runs that day
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
