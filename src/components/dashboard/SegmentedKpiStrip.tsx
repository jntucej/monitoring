"use client";

/**
 * SegmentedKpiStrip — four segmented-progress KPI cards (Board 3 / AI Command
 * Center). Each card shows a label, a value, and a 0..100 segmented progress
 * bar (real ratio, never fabricated). Real data only: when a `value` or
 * `maxValue` is missing the segment renders an explicit "N/A" empty state
 * rather than a fake 0%.
 */
import { cn } from "@/lib/utils";

export interface SegmentedKpi {
  label: string;
  value: number | null;
  maxValue: number | null;
  /** Explicit status colour for the filled segments. */
  status?: "ok" | "warn" | "error" | "info" | "neutral";
  hint?: string;
}

interface Props {
  items: SegmentedKpi[];
  className?: string;
}

const SEG_COLOR: Record<NonNullable<SegmentedKpi["status"]>, string> = {
  ok: "var(--action-success)",
  warn: "var(--action-warning)",
  error: "var(--action-danger)",
  info: "var(--action-info)",
  neutral: "var(--text-muted)",
};

function SegmentedBar({ value, maxValue, status }: { value: number | null; maxValue: number | null; status?: SegmentedKpi["status"] }) {
  const SEGS = 12;
  const has = value != null && maxValue != null && maxValue > 0;
  const filled = has ? Math.round((Math.max(0, value as number) / (maxValue as number)) * SEGS) : 0;
  const color = SEG_COLOR[status ?? "neutral"];
  return (
    <div className="flex gap-0.5" role="img" aria-label={has ? `${value} of ${maxValue}` : "no data"}>
      {Array.from({ length: SEGS }).map((_, i) => (
        <span
          key={i}
          className="h-1.5 flex-1 rounded-full"
          style={{ background: i < filled ? color : "var(--bg-elev-1)" }}
        />
      ))}
    </div>
  );
}

export function SegmentedKpiStrip({ items, className }: Props) {
  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3", className)}>
      {items.map((it) => {
        const has = it.value != null;
        return (
          <div key={it.label} className="surface-card bg-bg-surface p-3 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{it.label}</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: has ? "var(--text-primary)" : "var(--text-muted)" }}>
              {has ? it.value : "—"}
              {it.maxValue != null && has ? (
                <span className="text-sm font-normal text-text-muted"> / {it.maxValue}</span>
              ) : null}
            </p>
            <div className="mt-2">
              <SegmentedBar value={it.value} maxValue={it.maxValue} status={it.status} />
            </div>
            {it.hint ? <p className="mt-1.5 text-[11px] text-text-muted">{it.hint}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
