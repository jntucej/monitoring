"use client";

import React from "react";
import type { KpiTone } from "@/lib/org-map-adapters";

const TONE_BADGE: Record<KpiTone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  amber: "bg-amber-50 text-amber-700 border-amber-200/80",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
  rose: "bg-rose-50 text-rose-700 border-rose-200/80",
  navy: "bg-neutral-100 text-neutral-700 border-neutral-200/80",
};

const TONE_BAR: Record<KpiTone, string> = {
  emerald: "bg-emerald-600",
  amber: "bg-amber-500",
  indigo: "bg-indigo-600",
  rose: "bg-rose-600",
  navy: "bg-neutral-800",
};

export function TelemetryKpiCard({
  label,
  value,
  delta,
  sub,
  tone = "navy",
  segments,
}: {
  label: string;
  value: string | number;
  delta?: string;
  sub?: string;
  tone?: KpiTone;
  segments?: number;
}) {
  const activeSegments =
    segments ?? (tone === "rose" ? 2 : tone === "amber" ? 3 : 4);

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-neutral-500 truncate">
          {label}
        </span>
        {delta && (
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${TONE_BADGE[tone]}`}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-2 mt-2 mb-3">
        <span className="text-xl lg:text-2xl font-bold tracking-tight text-neutral-900">
          {value}
        </span>
        {sub && (
          <span className="text-[11px] text-neutral-400 truncate">{sub}</span>
        )}
      </div>
      <div className="h-2 w-full bg-neutral-100 rounded-md overflow-hidden flex gap-[2px] p-0.5">
        {[0, 1, 2, 3].map((seg) => (
          <span
            key={seg}
            className={`flex-1 rounded-sm ${
              seg < activeSegments ? TONE_BAR[tone] : "bg-neutral-200/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function BarcodeRatioCard({
  title,
  pct,
  countLabel,
  tone = "emerald",
}: {
  title: string;
  pct: number;
  countLabel: string;
  tone?: "emerald" | "amber" | "indigo" | "rose";
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const filledBars = Math.round((clamped / 100) * 24);
  const barColor = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    indigo: "bg-indigo-500",
    rose: "bg-rose-500",
  }[tone];

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-neutral-800">{title}</span>
        <span className="text-xs font-mono font-bold text-neutral-900">
          {clamped}%
        </span>
      </div>
      <div className="flex items-center gap-[3px] h-6 mb-1.5">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className={`flex-1 h-full rounded-sm ${
              i < filledBars ? barColor : "bg-neutral-100"
            }`}
          />
        ))}
      </div>
      <div className="text-[11px] text-neutral-500">{countLabel}</div>
    </div>
  );
}

export function UnifiedWorkspaceFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-3xl shadow-sm border border-neutral-200/80 overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}
