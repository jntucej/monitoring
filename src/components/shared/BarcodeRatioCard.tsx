"use client";

import React from "react";

/**
 * BarcodeRatioCard — a compact "N of M" ratio card with a 24-bar barcode
 * visual. Reusable across Student / Faculty / HOD / Operations screens.
 * WCAG AA: labels use text-slate-700/800 on white, darkened tones on tinted
 * chips. Never renders a raw UUID (accepts only human `label` + numbers).
 */
type BarcodeTone = "emerald" | "orange" | "indigo" | "rose" | "slate";

interface BarcodeRatioCardProps {
  label: string;
  count: number;
  total: number;
  tone?: BarcodeTone;
  subtitle?: string;
  onClick?: () => void;
}

const TONE_MAP: Record<
  BarcodeTone,
  { wrap: string; iconBg: string; bar: string; symbol: string }
> = {
  emerald: {
    wrap: "bg-emerald-50/70 border-emerald-200",
    iconBg: "bg-white text-emerald-700 border-emerald-200",
    bar: "bg-emerald-600",
    symbol: "✓",
  },
  orange: {
    wrap: "bg-orange-50/70 border-orange-200",
    iconBg: "bg-white text-orange-700 border-orange-200",
    bar: "bg-orange-600",
    symbol: "✕",
  },
  indigo: {
    wrap: "bg-indigo-50/70 border-indigo-200",
    iconBg: "bg-white text-indigo-700 border-indigo-200",
    bar: "bg-indigo-600",
    symbol: "◔",
  },
  rose: {
    wrap: "bg-rose-50/70 border-rose-200",
    iconBg: "bg-white text-rose-700 border-rose-200",
    bar: "bg-rose-600",
    symbol: "!",
  },
  slate: {
    wrap: "bg-slate-100/70 border-slate-300",
    iconBg: "bg-white text-slate-700 border-slate-300",
    bar: "bg-slate-600",
    symbol: "•",
  },
};

const BARS = 24;

export function BarcodeRatioCard({
  label,
  count,
  total,
  tone = "emerald",
  subtitle,
  onClick,
}: BarcodeRatioCardProps) {
  const styles = TONE_MAP[tone];
  const safeTotal = Math.max(0, total);
  const safeCount = Math.max(0, Math.min(Number.isFinite(count) ? count : 0, safeTotal || 0));
  const filledBars =
    safeTotal > 0 ? Math.round((safeCount / safeTotal) * BARS) : 0;
  const pct = safeTotal > 0 ? Math.round((safeCount / safeTotal) * 100) : 0;

  const Tag: React.ElementType = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={`${safeCount} of ${safeTotal} — ${label} (${pct}%)`}
      className={`w-full p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-left transition-colors ${styles.wrap} ${
        onClick ? "hover:border-slate-400 cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${styles.iconBg}`}
          aria-hidden="true"
        >
          {styles.symbol}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 tabular-nums">
            {safeTotal > 0 ? `${safeCount}/${safeTotal}` : "—"}
          </div>
          <div className="text-xs font-semibold text-slate-700 truncate">{label}</div>
          {subtitle && (
            <div className="text-[11px] font-medium text-slate-600 truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div
        className="flex items-center gap-[2px] h-7 shrink-0"
        aria-hidden="true"
      >
        {Array.from({ length: BARS }).map((_, idx) => (
          <span
            key={idx}
            className={`w-[2.5px] h-6 rounded-full ${
              idx < filledBars ? styles.bar : "bg-slate-300"
            }`}
          />
        ))}
      </div>
    </Tag>
  );
}
