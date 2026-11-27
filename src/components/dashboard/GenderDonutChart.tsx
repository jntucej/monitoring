"use client";

/**
 * GenderDonutChart — a pure-SVG donut of a real gender breakdown
 * (from /api/students/stats `byGender`: [{gender, count, color}]).
 * No fabricated proportions: each slice is count/total of the real data, and
 * an all-zero input renders an explicit empty state instead of a fake 50/50.
 * Slices are clickable when `onSliceClick` is supplied (routes into a page's
 * single inspector or filter).
 */
import { cn } from "@/lib/utils";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  slices: DonutSlice[];
  /** Center readout; defaults to the total. */
  centerLabel?: string;
  size?: number;
  onSliceClick?: (s: DonutSlice) => void;
  className?: string;
}

export function GenderDonutChart({
  slices,
  centerLabel,
  size = 160,
  onSliceClick,
  className,
}: Props) {
  const total = slices.reduce((s, x) => s + (x.value ?? 0), 0);
  const stroke = 22;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <div className={cn("flex items-center justify-center text-sm text-text-muted min-h-24", className)}>
        No breakdown data.
      </div>
    );
  }

  let offset = 0;
  const segments = slices.map((s) => {
    const frac = (s.value ?? 0) / total;
    const len = frac * circ;
    const seg = { ...s, dash: `${len} ${circ - len}`, dashoffset: -offset };
    offset += len;
    return seg;
  });

  return (
    <div className={cn("flex items-center gap-4 min-w-0", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0 -rotate-90"
        role="img"
        aria-label={`Breakdown, total ${total}`}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elev-1)" strokeWidth={stroke} />
        {segments.map((seg, i) => (
          <circle
            key={`${seg.label}-${i}`}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={seg.dash}
            strokeDashoffset={seg.dashoffset}
            style={onSliceClick ? { cursor: "pointer" } : undefined}
            onClick={() => onSliceClick?.(seg)}
            tabIndex={onSliceClick ? 0 : -1}
            onKeyDown={(e) => e.key === "Enter" && onSliceClick?.(seg)}
          >
            <title>{`${seg.label}: ${seg.value}`}</title>
          </circle>
        ))}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          className="rotate-90 origin-center"
          fontSize={20}
          fontWeight={700}
          fill="var(--text-primary)"
        >
          {centerLabel ?? total}
        </text>
      </svg>
      <ul className="space-y-1 min-w-0 text-xs">
        {slices.map((s, i) => (
          <li key={`${s.label}-${i}`} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-text-secondary truncate">{s.label}</span>
            <span className="font-mono text-text-muted ml-auto shrink-0">
              {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
