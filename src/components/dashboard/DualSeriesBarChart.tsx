"use client";

/**
 * DualSeriesBarChart — a grouped two-series bar chart (pure SVG). Two
 * series are drawn side-by-side per category; heights are driven by real
 * values (no fabricated bars). A legend identifies series A/B. An all-zero
 * input renders an explicit empty state.
 *
 * Board 2 (School Admin ERP) reference: dual-series comparison bars
 * (e.g. enrolment this-month vs last-month, or active vs suspended) wired to
 * real /api/admin/overview + /api/students/stats numbers.
 */
import { cn } from "@/lib/utils";

export interface BarCategory {
  label: string;
  a: number;
  b: number;
}

interface Props {
  data: BarCategory[];
  seriesA: { label: string; color: string };
  seriesB: { label: string; color: string };
  height?: number;
  className?: string;
}

export function DualSeriesBarChart({
  data,
  seriesA,
  seriesB,
  height = 200,
  className,
}: Props) {
  const maxVal = data.reduce((m, d) => Math.max(m, d.a, d.b), 0);
  const hasData = maxVal > 0;

  if (!hasData) {
    return (
      <div className={cn("flex items-center justify-center text-sm text-text-muted min-h-24", className)}>
        No data for this comparison.
      </div>
    );
  }

  const pad = 24;
  const W = 640;
  const H = height;
  const chartH = H - pad * 2;
  const groupW = (W - pad * 2) / data.length;
  const barW = Math.min(28, groupW / 2.5);
  const gap = 6;

  return (
    <div className={cn("w-full min-w-0", className)}>
      {/* legend */}
      <div className="mb-2 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: seriesA.color }} />
          <span className="text-text-secondary">{seriesA.label}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: seriesB.color }} />
          <span className="text-text-secondary">{seriesB.label}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={`${seriesA.label} vs ${seriesB.label} across ${data.length} categories`}
        className="overflow-visible"
      >
        {/* baseline */}
        <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke="var(--border)" strokeWidth={1} />
        {data.map((d, i) => {
          const gx = pad + i * groupW + groupW / 2;
          const ha = (d.a / maxVal) * chartH;
          const hb = (d.b / maxVal) * chartH;
          const baseY = H - pad;
          return (
            <g key={d.label}>
              <rect
                x={gx - barW - gap / 2}
                y={baseY - ha}
                width={barW}
                height={ha}
                rx={3}
                fill={seriesA.color}
                fillOpacity={0.9}
              >
                <title>{`${d.label} · ${seriesA.label}: ${d.a}`}</title>
              </rect>
              <rect
                x={gx + gap / 2}
                y={baseY - hb}
                width={barW}
                height={hb}
                rx={3}
                fill={seriesB.color}
                fillOpacity={0.9}
              >
                <title>{`${d.label} · ${seriesB.label}: ${d.b}`}</title>
              </rect>
              <text
                x={gx}
                y={baseY + 14}
                textAnchor="middle"
                fontSize={11}
                fill="var(--text-muted)"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
