"use client";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ChainDotsProps } from "./types";
import { statusColor, VIZ_THEME } from "./theme";

const DOT_R = 8;
const CONNECTOR_W = 2;

/** Horizontal stepper: ●─●─●. Each stage is a colored dot with label/meta.
 *  done → action-primary, active → action-warning (with a subtle glow),
 *  pending → border. Connector lines join consecutive dots. */
export function ChainDots({ stages, label, onStageClick, className }: ChainDotsProps) {
  const W = 640;
  const H = 64;

  // Distribute dots evenly across the width.
  const n = stages.length;
  const dotXs = useMemo(() => {
    if (n === 0) return [] as number[];
    if (n === 1) return [W / 2];
    const pad = DOT_R * 2 + 20;
    const step = (W - pad * 2) / (n - 1);
    return stages.map((_, i) => pad + i * step);
  }, [n]);

  const dotColor = (s: (typeof stages)[number]) => {
    switch (s.status) {
      case "done":
        return statusColor("ok");
      case "active":
        return statusColor("warn");
      case "pending":
        return VIZ_THEME.border;
      default:
        return VIZ_THEME.neutral;
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 text-[11px] font-medium" style={{ color: VIZ_THEME.muted }}>
        {label}
      </div>
      <svg
        role="img"
        aria-label={`${label}: ${stages
          .map((s) => s.label)
          .join(" → ")}`}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="overflow-visible"
      >
        {/* connector lines between consecutive dots */}
        {stages.slice(0, -1).map((s, i) => {
          const x1 = dotXs[i];
          const x2 = dotXs[i + 1];
          const y = H / 2 - 8; // center dots vertically a bit higher
          // A connector is "filled" when the preceding stage is done.
          const filled = s.status === "done";
          return (
            <line
              key={`conn-${i}`}
              x1={x1 + DOT_R + 4}
              y1={y}
              x2={x2 - DOT_R - 4}
              y2={y}
              stroke={filled ? statusColor("ok") : VIZ_THEME.border}
              strokeOpacity={filled ? 0.7 : 0.4}
              strokeWidth={CONNECTOR_W}
            />
          );
        })}

        {/* dots */}
        {stages.map((s, i) => {
          const cx = dotXs[i];
          const cy = H / 2 - 8;
          const c = dotColor(s);
          const glow = s.status === "active";
          const interactive = !!onStageClick;
          return (
            <g
              key={s.id}
              transform={`translate(${cx} ${cy})`}
              onClick={() => onStageClick?.(s.id)}
              style={{ cursor: interactive ? "pointer" : "default" }}
              role={interactive ? "button" : "img"}
              aria-label={`${s.label} — ${s.status}${s.meta ? `, ${s.meta}` : ""}`}
              tabIndex={interactive ? 0 : -1}
              onKeyDown={(ev) => ev.key === "Enter" && onStageClick?.(s.id)}
            >
              {glow && <circle r={DOT_R + 6} fill={c} fillOpacity={0.18} />}
              <circle
                r={DOT_R}
                fill={s.status === "pending" ? VIZ_THEME.surface : c}
                stroke={c}
                strokeWidth={2}
              />
              {s.status === "done" && (
                <path
                  d="M -3.5 0.5 L -1 3 L 4 -3"
                  fill="none"
                  stroke="var(--bg-surface)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              <text y={DOT_R + 12} textAnchor="middle" fontSize={11} fill={VIZ_THEME.text}>
                {s.label}
              </text>
              {s.meta && (
                <text y={DOT_R + 24} textAnchor="middle" fontSize={9} fill={VIZ_THEME.muted}>
                  {s.meta}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
