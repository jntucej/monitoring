// src/components/sysadmin/domains/automation/DeploymentsContent.tsx
"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useDashboardData } from "@/hooks/useDashboardData";
import { MiniGauge } from "@/components/sysadmin/kit/sidebar";
import type { DeploymentsData, DeploymentsEnvelope, DeploymentsEntity, DeploymentRow } from "./types";

// ── helpers ───────────────────────────────────────────────────────────────────

function relative(ts: string | null): string {
  if (!ts) return "never";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const DOT_COLORS: Record<string, string> = {
  deployed: "var(--action-primary)",
  skipped: "var(--text-muted)",
  failed: "var(--action-danger)",
  git_error: "var(--action-warning)",
};

function dotColor(status: string): string {
  return DOT_COLORS[status] ?? "var(--text-muted)";
}

// ── release rail (compact horizontal timeline) ────────────────────────────────

function ReleaseRail({ rows }: { rows: DeploymentRow[] }) {
  // Take up to the 20 most recent deployments for the rail
  const visible = rows.slice(0, 20);

  const barMax = useMemo(() => {
    // Use version length as a proxy for "change size" (more characters = larger release)
    const max = visible.reduce((m, d) => {
      const size = (d.version ?? d.message ?? "").length;
      return Math.max(m, size);
    }, 1);
    return max || 1;
  }, [visible]);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)] py-3">
        No deployment records.
      </p>
    );
  }

  const gap = 8;
  const totalW = visible.length * (gap + 20);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW} 80`}
        width={totalW}
        height={80}
        className="shrink-0"
      >
        {/* horizontal connecting line */}
        <line
          x1={10}
          y1={50}
          x2={totalW - 10}
          y2={50}
          stroke="var(--border)"
          strokeWidth={2}
        />
        {visible.map((d, i) => {
          const cx = 10 + i * (gap + 20);
          const dotR = 5;
          const color = dotColor(d.status);
          const changeSize = (d.version ?? d.message ?? "").length;
          const barH = Math.round((changeSize / barMax) * 24);

          return (
            <g key={d.id}>
              {/* change-size bar (vertical, behind dot) */}
              {changeSize > 0 && (
                <rect
                  x={cx - 2}
                  y={50 - barH}
                  width={4}
                  height={barH}
                  rx={2}
                  fill={color}
                  opacity={0.35}
                />
              )}
              {/* dot */}
              <circle
                cx={cx}
                cy={50}
                r={dotR}
                fill={color}
                stroke="var(--bg-surface)"
                strokeWidth={1.5}
              />
              {/* label below */}
              <text
                x={cx}
                y={70}
                textAnchor="middle"
                fontSize={9}
                fill="var(--text-muted)"
              >
                {d.version ?? (d.commit ? d.commit.slice(0, 6) : "?")}
              </text>
            </g>
          );
        })}
      </svg>
      {/* tooltip row */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {visible.map((d, i) => (
          <div
            key={d.id}
            className="shrink-0 text-[9px] text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border)] w-[28px] text-center"
            title={`${d.status} · ${relative(d.created_at)}`}
          >
            {new Date(d.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

export function DeploymentsContent(
  _props?: {
    data?: DeploymentsData | null;
    onRowClick?: (entity: DeploymentsEntity) => void;
  },
) {
  const { data: externalData, onRowClick: _onRowClick } = _props ?? {};
  const { data: envelope, loading, error } = useDashboardData<DeploymentsEnvelope>(
    "/api/admin/deployments/overview",
    { ttlMs: 180_000, pollMs: 60_000, enabled: externalData == null },
  );
  const deploymentsData: DeploymentsData | null = externalData ?? envelope?.data ?? null;

  if (loading && !deploymentsData) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--bg-surface)] opacity-40" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--action-danger)]/30 bg-[var(--action-danger)]/10 p-4 text-sm text-[var(--action-danger)]">
        Failed to load deployment data: {error}
      </div>
    );
  }

  if (!deploymentsData) return null;

  const { kpis, deployments } = deploymentsData;

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* last deploy */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
            Last Deploy
          </p>
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            {relative(kpis.lastDeployAt)}
          </span>
        </div>

        {/* health gate pass % */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
            Health Gate
          </p>
          <div className="flex items-center gap-2">
            <MiniGauge
              value={kpis.healthGatePassPct / 100}
              label={`Health gate ${kpis.healthGatePassPct}%`}
              color={
                kpis.healthGatePassPct >= 80
                  ? "var(--action-primary)"
                  : "var(--action-warning)"
              }
            />
            <span className="text-lg font-semibold text-[var(--text-primary)]">
              {kpis.healthGatePassPct}%
            </span>
          </div>
        </div>

        {/* rollbacks 30d */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
            Rollbacks 30d
          </p>
          <span
            className={cn(
              "text-lg font-semibold",
              kpis.rollbacks30d > 0
                ? "text-[var(--action-warning)]"
                : "text-[var(--text-primary)]",
            )}
          >
            {kpis.rollbacks30d}
          </span>
        </div>

        {/* lead time */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1">
            Lead Time
          </p>
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            {kpis.leadTimeAvgMin > 0 ? `${kpis.leadTimeAvgMin}m` : "—"}
          </span>
        </div>
      </div>

      {/* Signature visual: release rail */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Release Rail
        </p>
        <ReleaseRail rows={deployments} />
      </div>

      {/* Recent deployments table */}
      {deployments.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Version</th>
                <th className="px-3 py-2">Detail</th>
                <th className="px-3 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {deployments.slice(0, 15).map((d) => (
                <tr key={d.id} className="border-b border-[var(--border)] last:border-b-0">
                  <td className="px-3 py-2">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: dotColor(d.status) }}
                    />
                    <span className="ml-2 text-xs text-[var(--text-muted)]">
                      {d.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-[var(--text-primary)]">
                    {d.version ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                    {d.message ?? d.commit ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {relative(d.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
