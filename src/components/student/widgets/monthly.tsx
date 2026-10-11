"use client";
import { Footprints, Clock } from "lucide-react";
import type { StudentWidgetProps } from "./index";

export interface MonthlyPayload {
  yearMonth: string; total: number; daily: number; home: number;
  daypass: number; night: number; minutesOut: number;
}

export default function MonthlyCard({ payload }: StudentWidgetProps) {
  const data = payload.monthly as MonthlyPayload;
  if (!data) return null;
  const hours = Math.floor(data.minutesOut / 60);
  const mins  = data.minutesOut % 60;
  const rows: Array<[string, number, string]> = [
    ["Total outings", data.total,   "text-[var(--text-primary)]"],
    ["Daily outing",  data.daily,   "text-emerald-400"],
    ["Home out",      data.home,    "text-sky-400"],
    ["Day pass",      data.daypass, "text-amber-400"],
    ["Night",         data.night,   "text-violet-400"],
  ];
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Monthly Outing</h3>
        <span className="text-xs text-[var(--text-muted)]">{data.yearMonth}</span>
      </header>
      <div className="mb-4 flex items-baseline gap-2">
        <Footprints className="h-4 w-4 text-[var(--action-primary)]" />
        <span className="text-3xl font-semibold tabular-nums">{data.total}</span>
        <span className="text-xs text-[var(--text-muted)]">times out</span>
      </div>
      <dl className="space-y-1.5">
        {rows.map(([label, value, cls]) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <dt className="text-[var(--text-secondary)]">{label}</dt>
            <dd className={`font-medium tabular-nums ${cls}`}>{value}</dd>
          </div>
        ))}
        <div className="mt-2 flex items-center justify-between border-t border-[var(--border)] pt-2 text-sm">
          <dt className="flex items-center gap-1 text-[var(--text-secondary)]">
            <Clock className="h-3.5 w-3.5" /> Time outside
          </dt>
          <dd className="font-medium tabular-nums">{hours}h {mins}m</dd>
        </div>
      </dl>
    </article>
  );
}
