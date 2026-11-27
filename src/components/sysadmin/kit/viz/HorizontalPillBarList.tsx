"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { HorizontalPillBar } from "./types";
import { statusColor, clamp01, VIZ_THEME } from "./theme";

/**
 * HorizontalPillBarList — a vertical stack of labeled horizontal bars.
 *
 * Each row shows a label, a proportional fill bar (driven by `value`/`maxValue`,
 * or a fixed ratio when `maxValue` is omitted), and a value readout. Pure
 * CSS/Tailwind — no SVG — so it slots into any dashboard card and adapts to
 * the active theme via CSS vars. Rows are clickable when `onItemClick` is
 * supplied, so they can route into a page's single inspector without a local
 * stub.
 *
 * This is the canonical "horizontal pill bar" primitive shared by the Campus
 * Analytics board (entry channels / browser split / top actions) and any
 * other role dashboard that needs a label+ratio list.
 */
export function HorizontalPillBarList({
  label,
  items,
  maxValue,
  showValues = true,
  onItemClick,
  className,
}: {
  label?: string;
  items: HorizontalPillBar[];
  /** Absolute upper bound for the fill ratio. When omitted the largest item
   *  value is used, so the biggest bar fills 100% and the rest scale down. */
  maxValue?: number;
  showValues?: boolean;
  onItemClick?: (item: HorizontalPillBar, index: number) => void;
  className?: string;
}) {
  const autoMax = useMemo(
    () => items.reduce((m, it) => Math.max(m, it.value ?? 0), 0),
    [items],
  );
  const max = maxValue ?? autoMax;
  const total = items.reduce((s, it) => s + (it.value ?? 0), 0);

  if (items.length === 0) {
    return (
      <div className={cn("text-xs", className)} style={{ color: VIZ_THEME.muted }}>
        {label ? `${label}: no data` : "No data"}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-2 text-xs font-semibold" style={{ color: VIZ_THEME.text }}>
          {label}
        </div>
      )}
      <div className="space-y-2">
        {items.map((it, i) => {
          const value = it.value ?? 0;
          const ratio = max > 0 ? clamp01(value / max) : 0;
          const fill = it.status ? statusColor(it.status) : VIZ_THEME.ok;
          const clickable = !!onItemClick;
          const inner = (
            <>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="truncate" style={{ color: VIZ_THEME.text }}>
                  {it.label}
                </span>
                {showValues && (
                  <span className="shrink-0 font-mono font-semibold" style={{ color: VIZ_THEME.muted }}>
                    {it.valueLabel ??
                      (it.value == null
                        ? "—"
                        : `${it.value}${total > 0 && it.unit === "pct" ? "%" : ""}`)}
                  </span>
                )}
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ background: "var(--bg-elev-1)" }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{ width: `${Math.round(ratio * 100)}%`, background: fill }}
                />
              </div>
            </>
          );
          return clickable ? (
            <button
              key={it.key ?? `${it.label}-${i}`}
              type="button"
              onClick={() => onItemClick?.(it, i)}
              className="block w-full rounded-lg px-2 py-1 text-left transition-colors hover:bg-[var(--bg-elev-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
              aria-label={`${it.label}: ${it.valueLabel ?? value}`}
            >
              {inner}
            </button>
          ) : (
            <div key={it.key ?? `${it.label}-${i}`}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
