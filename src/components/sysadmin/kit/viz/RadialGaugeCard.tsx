"use client";

import { cn } from "@/lib/utils";
import { statusColor, VIZ_THEME } from "./theme";

/**
 * RadialGaugeCard — a semi-circular (180°) radial gauge card for a single
 * metric (CPU / RAM / Bandwidth). Pure SVG + CSS vars; the arc fill and value
 * are driven by an explicit 0..100 `value` and a `status` so the consumer
 * decides colour (e.g. ok < 60, warn < 85, error >= 85) rather than the gauge
 * guessing. A `null` value renders an explicit "N/A" empty state instead of a
 * fabricated 0.
 *
 * This is the canonical per-node radial gauge used by the AI Command Center /
 * DevOps board (Board 3) for the sysadmin docker-services and infrastructure
 * consoles.
 */
export function RadialGaugeCard({
  title,
  value,
  status = "neutral",
  unit = "%",
  meta,
  size = 120,
  onInspect,
  className,
}: {
  title: string;
  /** 0..100, or null/undefined to show an explicit N/A empty state. */
  value: number | null | undefined;
  status?: "ok" | "warn" | "error" | "info" | "neutral";
  unit?: string;
  meta?: string;
  size?: number;
  onInspect?: () => void;
  className?: string;
}) {
  const hasValue = value != null && Number.isFinite(value);
  const clamped = hasValue ? Math.max(0, Math.min(100, value as number)) : 0;
  const stroke = 8;
  const cx = size / 2;
  const cy = size / 2;
  const r = cx - stroke - 4;
  // 180° arc: from (cx - r, cy) to (cx + r, cy).
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const valueColor = hasValue ? statusColor(status) : VIZ_THEME.neutral;

  // Arc-length for the value fraction (half circumference = π * r).
  const halfCirc = Math.PI * r;
  const valueLen = (clamped / 100) * halfCirc;

  return (
    <div
      className={cn("surface-card bg-bg-surface p-3 min-w-0 text-center", onInspect && "cursor-pointer", className)}
      onClick={onInspect}
      role={onInspect ? "button" : undefined}
      tabIndex={onInspect ? 0 : undefined}
      onKeyDown={(e) => e.key === "Enter" && onInspect?.()}
      aria-label={
        hasValue ? `${title}: ${clamped}${unit}` : `${title}: no data available`
      }
    >
      <div className="relative mx-auto" style={{ width: size, height: size / 2 + stroke }}>
        <svg
          width={size}
          height={size / 2 + stroke}
          viewBox={`0 0 ${size} ${size / 2 + stroke}`}
          role="img"
          aria-hidden={onInspect ? undefined : true}
        >
          {/* track */}
          <path d={arc} fill="none" stroke="var(--bg-elev-1)" strokeWidth={stroke} strokeLinecap="round" />
          {/* value */}
          {hasValue ? (
            <path
              d={arc}
              fill="none"
              stroke={valueColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${valueLen} ${halfCirc}`}
            />
          ) : null}
        </svg>
        <div
          className="absolute inset-x-0"
          style={{ top: 0, height: size / 2 + stroke, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 2 }}
        >
          <span className="font-mono text-lg font-bold" style={{ color: hasValue ? valueColor : VIZ_THEME.muted }}>
            {hasValue ? `${Math.round(clamped)}` : "—"}
          </span>
        </div>
      </div>
      <div className="mt-1 text-xs font-semibold" style={{ color: VIZ_THEME.text }}>
        {title}
      </div>
      {hasValue ? (
        <div className="text-[11px] font-mono" style={{ color: VIZ_THEME.muted }}>
          {Math.round(clamped)}
          {unit}
          {meta ? ` · ${meta}` : ""}
        </div>
      ) : (
        <div className="text-[11px]" style={{ color: VIZ_THEME.muted }}>
          {meta ? `no data · ${meta}` : "no data"}
        </div>
      )}
    </div>
  );
}
