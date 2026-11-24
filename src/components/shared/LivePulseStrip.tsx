"use client";

export interface PulseGaugeItem {
  id: string;
  label: string;
  valueLabel: string;
  benchmark: string;
  ratio?: number; // 0..1 for progress bar
  tone?: "ok" | "warn" | "danger" | "info";
}

export interface LivePulseStripProps {
  items: PulseGaugeItem[];
  ariaLabel?: string;
}

const TONE_BAR: Record<NonNullable<PulseGaugeItem["tone"]>, string> = {
  ok: "bg-action-success",
  warn: "bg-action-warning",
  danger: "bg-action-danger",
  info: "bg-action-primary",
};

const TONE_PILL: Record<NonNullable<PulseGaugeItem["tone"]>, string> = {
  ok: "bg-action-success/15 text-action-success",
  warn: "bg-amber-500/15 text-action-warning",
  danger: "bg-action-danger/15 text-action-danger",
  info: "bg-action-primary/15 text-action-primary",
};

/**
 * LivePulseStrip — 3-4 compact visual micro-gauges / ratio bars answering
 * "Is everything normal right now?" with plain-English benchmarks.
 */
export function LivePulseStrip({
  items,
  ariaLabel = "Live operational pulse",
}: LivePulseStripProps) {
  if (items.length === 0) return null;

  return (
    <section
      aria-label={ariaLabel}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {items.slice(0, 4).map((item) => {
        const tone = item.tone ?? "info";
        const pct =
          typeof item.ratio === "number"
            ? Math.max(0, Math.min(100, Math.round(item.ratio * 100)))
            : null;

        return (
          <div
            key={item.id}
            className="surface-card bg-bg-surface p-3 flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-text-muted truncate">
                {item.label}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${TONE_PILL[tone]}`}
              >
                {item.valueLabel}
              </span>
            </div>
            {pct !== null && (
              <div
                className="h-1.5 w-full rounded-full bg-bg-elevated overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={item.label}
              >
                <div
                  className={`h-full rounded-full transition-all ${TONE_BAR[tone]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            <p className="text-[11px] text-text-secondary truncate">
              {item.benchmark}
            </p>
          </div>
        );
      })}
    </section>
  );
}

export default LivePulseStrip;
