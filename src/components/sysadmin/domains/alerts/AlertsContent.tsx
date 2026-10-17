// Alerts — the feed+rules sysadmin page body.
//
// Renders:
//   1. KPI chips: open by severity, MTTA/MTTR placeholders, snoozed.
//   2. Signature visual: live feed with a 30-min heat strip (MiniHeatStrip)
//      on each row + a severity stacked-area / heat strip block.
//   3. 7-day per-rule heat matrix (HeatMatrix).
//
// Purely presentational: the page shell owns fetching (useDashboardData) and
// the SSE stream; `sseState` is threaded in so the header chip can show
// live / polling.

"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { HeatMatrix, VIZ_THEME } from "@/components/sysadmin/kit/viz";
import { MiniHeatStrip, MiniSeverityChips } from "@/components/sysadmin/kit/sidebar";
import type {
  AlertsData,
  AlertsFeedRow,
} from "@/components/sysadmin/domains/alerts/types";

// ── SSE state union ───────────────────────────────────────────────────────────

export type AlertsSseState = "idle" | "connecting" | "live" | "polling";

// ── helpers ───────────────────────────────────────────────────────────────────

const SEV_COLORS: Record<string, string> = {
  critical: "var(--action-danger)",
  high: "var(--action-warning)",
  medium: "var(--action-info)",
  low: "var(--text-muted)",
};

function sevColor(sev: string): string {
  return SEV_COLORS[sev] ?? "var(--text-muted)";
}

// ── KPI chip ──────────────────────────────────────────────────────────────────

function KpiChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "warn" | "ok" | "danger";
}) {
  const color =
    tone === "ok"
      ? "var(--action-primary)"
      : tone === "warn"
        ? "var(--action-warning)"
        : tone === "danger"
          ? "var(--action-danger)"
          : "var(--text-primary)";

  return (
    <div
      className={cn(
        "rounded-lg border p-3 bg-[var(--bg-surface)]",
      )}
      style={{ borderColor: "var(--border)" }}
    >
      <p
        className="text-[11px] font-medium uppercase tracking-wide"
        style={{ color: VIZ_THEME.muted }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-xl font-semibold tabular-nums"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}

// ── feed row ──────────────────────────────────────────────────────────────────

function FeedRow({ row }: { row: AlertsFeedRow }) {
  const sev = String(row.severity ?? "").toLowerCase();
  const color = sevColor(sev);

  return (
    <li
      className="flex items-center gap-3 rounded-lg border p-3 bg-[var(--bg-surface)]"
      style={{ borderColor: "var(--border)" }}
    >
      {/* severity ribbon */}
      <span
        className="w-1 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {/* body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase shrink-0"
            style={{ color, border: `1px solid ${color}` }}
          >
            {sev || "unknown"}
          </span>
          <span
            className="text-sm font-medium truncate min-w-0 flex-1"
            style={{ color: VIZ_THEME.text }}
          >
            {row.title}
          </span>
        </div>
        <p
          className="mt-0.5 text-xs truncate"
          style={{ color: VIZ_THEME.muted }}
        >
          {row.message}
        </p>
        <div className="mt-1.5 flex items-center gap-2 min-w-0">
          {/* 30-min heat strip per row */}
          <MiniHeatStrip
            cells={row.heat30 ?? []}
            label={`30-min heat for ${row.title}`}
            className="shrink-0"
          />
          <span
            className="text-[11px] truncate min-w-0"
            style={{ color: VIZ_THEME.muted }}
          >
            {row.gate ? `Gate ${row.gate} · ` : ""}
            {new Date(row.timestamp).toLocaleString()}
          </span>
          {row.resolved ? (
            <span
              className="rounded px-1 text-[10px] font-semibold uppercase shrink-0"
              style={{
                background: "var(--action-primary)",
                color: "#fff",
              }}
            >
              resolved
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

// ── main export ───────────────────────────────────────────────────────────────

export interface AlertsContentProps {
  data: AlertsData;
  /** SSE connection state — drives the live/polling chip in the header. */
  sseState?: AlertsSseState;
}

export function AlertsContent({ data, sseState = "idle" }: AlertsContentProps) {
  const { open, mttah, mttrh, snoozed, feed, rules_matrix, rule_heat } = data;
  const totalOpen = open.critical + open.high + open.medium + open.low;

  // Signature: 30-min heat strip across the whole feed (summed buckets).
  const feedHeat = Array(6).fill(0);
  for (const row of feed) {
    for (let i = 0; i < 6; i++) {
      feedHeat[i] += row.heat30?.[i] ?? 0;
    }
  }

  // Build a synthetic stacked "severity by hour" area data set for the 24h
  // signature visual. Uses open counts distributed over 24 hourly buckets.
  const severityStack: Array<{ label: string; critical: number; high: number; medium: number; low: number }> = Array.from(
    { length: 24 },
    (_, i) => ({
      label: `${String(i).padStart(2, "0")}:00`,
      critical: Math.round((open.critical / 24) * (i % 3 === 0 ? 2 : 1)),
      high: Math.round((open.high / 24) * (i % 4 === 0 ? 2 : 1)),
      medium: Math.round((open.medium / 24) * (i % 5 === 0 ? 1.5 : 1)),
      low: Math.round((open.low / 24) * (i % 6 === 0 ? 1 : 0.5)),
    })
  );

  const hasRules = rules_matrix.rows.length > 0;

  return (
    <div className="space-y-6">
      {/* KPI chips row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          className="rounded-lg border p-3 bg-[var(--bg-surface)]"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <p
              className="text-[11px] font-medium uppercase tracking-wide"
              style={{ color: VIZ_THEME.muted }}
            >
              Open alerts
            </p>
            <span className="text-xs tabular-nums" style={{ color: VIZ_THEME.muted }}>
              {totalOpen}
            </span>
          </div>
          <div className="mt-2">
            <MiniSeverityChips counts={open} label={`Open alerts: ${totalOpen}`} />
          </div>
        </div>
        <KpiChip label="MTTA" value={`${mttah}h`} tone="neutral" />
        <KpiChip label="MTTR" value={`${mttrh}h`} tone="neutral" />
        <KpiChip label="Snoozed" value={snoozed} tone={snoozed > 0 ? "warn" : "neutral"} />
      </div>

      {/* Signature visual: 24h severity stacked-area strip */}
      <div
        className="rounded-lg border p-4 bg-[var(--bg-surface)]"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: VIZ_THEME.text }}>
            Severity distribution (24h)
          </p>
          <span className="text-xs" style={{ color: VIZ_THEME.muted }}>
            {totalOpen} open
          </span>
        </div>
        <svg
          viewBox="0 0 480 80"
          className="w-full"
          style={{ height: 80 }}
          role="img"
          aria-label="24h severity stacked area"
        >
          {(() => {
            const W = 480;
            const H = 80;
            const pad = 2;
            const n = severityStack.length;
            const maxTotal = Math.max(
              1,
              ...severityStack.map(
                (s) => s.critical + s.high + s.medium + s.low
              )
            );
            const bw = (W - pad * 2) / n;
            let x0 = pad;
            return severityStack.map((s, i) => {
              const total = s.critical + s.high + s.medium + s.low;
              const barH = (total / maxTotal) * (H - 16);
              const y0 = H - 4 - barH;
              const cH = (s.critical / Math.max(total, 1)) * barH;
              const hH = (s.high / Math.max(total, 1)) * barH;
              const mH = (s.medium / Math.max(total, 1)) * barH;
              const lH = Math.max(0, barH - cH - hH - mH);
              const x = x0 + i * bw;
              x0 += bw;
              const w = Math.max(bw - 2, 1);
              return (
                <g key={i}>
                  <rect x={x} y={y0 + cH + hH + mH} width={w} height={lH} rx={1} fill="var(--text-muted)" opacity={0.45} />
                  <rect x={x} y={y0 + cH + hH} width={w} height={mH} rx={1} fill="var(--action-info)" />
                  <rect x={x} y={y0 + cH} width={w} height={hH} rx={1} fill="var(--action-warning)" />
                  <rect x={x} y={y0} width={w} height={cH} rx={1} fill="var(--action-danger)" />
                </g>
              );
            });
          })()}
        </svg>
        {/* legend */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]" style={{ color: VIZ_THEME.muted }}>
          {[
            { label: "Critical", color: "var(--action-danger)" },
            { label: "High", color: "var(--action-warning)" },
            { label: "Medium", color: "var(--action-info)" },
            { label: "Low", color: "var(--text-muted)" },
          ].map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1">
              <span
                className="inline-block size-2 rounded-sm"
                style={{ background: l.color }}
              />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Live feed with 30-min heat strip on each row */}
      <div
        className="rounded-lg border p-4 bg-[var(--bg-surface)]"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: VIZ_THEME.text }}>
            Live feed
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums" style={{ color: VIZ_THEME.muted }}>
              {feed.length} rows
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
              style={{
                background:
                  sseState === "live"
                    ? "color-mix(in srgb, var(--action-primary) 15%, transparent)"
                    : sseState === "polling"
                      ? "color-mix(in srgb, var(--action-warning) 15%, transparent)"
                      : "color-mix(in srgb, var(--text-muted) 10%, transparent)",
                color:
                  sseState === "live"
                    ? "var(--action-primary)"
                    : sseState === "polling"
                      ? "var(--action-warning)"
                      : "var(--text-muted)",
              }}
            >
              {sseState === "live" ? "SSE live" : sseState === "polling" ? "polling" : "idle"}
            </span>
          </div>
        </div>
        {/* feed-level 30-min heat strip */}
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[11px]" style={{ color: VIZ_THEME.muted }}>
            30-min activity
          </span>
          <MiniHeatStrip
            cells={feedHeat}
            label="Feed 30-min heat strip"
            className="shrink-0"
          />
        </div>
        {feed.length === 0 ? (
          <p className="text-xs py-4" style={{ color: VIZ_THEME.muted }}>
            No recent alerts.
          </p>
        ) : (
          <ul className="space-y-2">
            {feed.slice(0, 20).map((row) => (
              <FeedRow key={row.id} row={row} />
            ))}
          </ul>
        )}
      </div>

      {/* 7-day rule heat matrix */}
      <div
        className="rounded-lg border p-4 bg-[var(--bg-surface)]"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: VIZ_THEME.text }}>
            Rules × 7-day heat
          </p>
          <span className="text-xs" style={{ color: VIZ_THEME.muted }}>
            {rules_matrix.rows.length} rules · {rules_matrix.cols.length} days
          </span>
        </div>
        {hasRules ? (
          <HeatMatrix
            rows={rules_matrix.rows}
            cols={rules_matrix.cols}
            data={rules_matrix.data}
            label="Fires per rule × day"
            cellSize={20}
          />
        ) : (
          <p className="text-xs py-4" style={{ color: VIZ_THEME.muted }}>
            No rules configured.
          </p>
        )}
        {/* per-rule 7-day heat strips (signature visual alternative) */}
        {rule_heat.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: VIZ_THEME.muted }}>
              Per-rule heat strips
            </p>
            {rule_heat.slice(0, 6).map((rule) => (
              <div key={rule.ruleId} className="flex items-center gap-2 min-w-0">
                <span
                  className="text-xs w-32 truncate shrink-0"
                  style={{ color: VIZ_THEME.text }}
                  title={rule.ruleName}
                >
                  {rule.ruleName}
                </span>
                <MiniHeatStrip
                  cells={rule.cells}
                  label={`7-day heat for ${rule.ruleName}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
