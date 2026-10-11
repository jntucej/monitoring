"use client";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { StudentWidgetProps } from "./index";

export interface CurfewPayload {
  today: { score: number; onTime: number; late: number; violations: number };
  thirtyDayAvg: number;
  thirtyDayLate: number;
  trend: "up" | "down" | "flat";
}

export default function CurfewCard({ payload }: StudentWidgetProps) {
  const data = payload.curfew as CurfewPayload;
  if (!data) return null;
  const { score } = data.today;
  const ring = score >= 90 ? "text-emerald-400" : score >= 70 ? "text-amber-400" : "text-rose-400";
  const TrendIcon = data.trend === "up" ? TrendingUp : data.trend === "down" ? TrendingDown : Minus;
  const trendColor = data.trend === "up" ? "text-emerald-400" : data.trend === "down" ? "text-rose-400" : "text-[var(--text-muted)]";
  const circ = 2 * Math.PI * 40;
  const off = circ * (1 - score / 100);

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Curfew Score</h3>
        <span className={`flex items-center gap-1 text-xs ${trendColor}`}>
          <TrendIcon className="h-3.5 w-3.5" />
          {data.trend === "flat" ? "stable" : `${Math.abs(data.today.score - data.thirtyDayAvg)} pts`}
        </span>
      </header>
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 100 100" className={`h-24 w-24 -rotate-90 ${ring}`}>
          <circle cx="50" cy="50" r="40" stroke="currentColor" strokeOpacity="0.15" strokeWidth="8" fill="none" />
          <motion.circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none"
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: off }}
            transition={{ duration: 0.9, ease: "easeOut" }} />
        </svg>
        <div>
          <p className="text-3xl font-semibold tabular-nums">{score}</p>
          <p className="text-xs text-[var(--text-muted)]">30-day avg {data.thirtyDayAvg}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-[var(--border)] py-2">
          <dt className="text-[10px] uppercase text-[var(--text-muted)]">On time</dt>
          <dd className="text-sm font-semibold text-emerald-400 tabular-nums">{data.today.onTime}</dd>
        </div>
        <div className="rounded-xl border border-[var(--border)] py-2">
          <dt className="text-[10px] uppercase text-[var(--text-muted)]">Late</dt>
          <dd className="text-sm font-semibold text-amber-400 tabular-nums">{data.today.late}</dd>
        </div>
        <div className="rounded-xl border border-[var(--border)] py-2">
          <dt className="text-[10px] uppercase text-[var(--text-muted)]">Violations</dt>
          <dd className="text-sm font-semibold text-rose-400 tabular-nums">{data.today.violations}</dd>
        </div>
      </dl>
    </article>
  );
}
