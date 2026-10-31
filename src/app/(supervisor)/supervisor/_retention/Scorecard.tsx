"use client";

import { TrendingUp, TrendingDown, Minus, Award, Zap } from "lucide-react";
import { useSupervisorRetention } from "@/stores/supervisorRetentionStore";

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function Scorecard({
  thisWeek,
  lastWeek,
  avgResponseSec,
}: {
  thisWeek: number;
  lastWeek: number;
  avgResponseSec: number;
}) {
  const bests = useSupervisorRetention((s) => s.bests);
  const sessionDecisions = useSupervisorRetention((s) => s.sessionDecisions);

  const delta = thisWeek - lastWeek;
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const trendClass =
    delta > 0
      ? "text-[var(--action-primary)]"
      : delta < 0
      ? "text-[var(--action-danger)]"
      : "text-[var(--text-muted)]";

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Your scorecard</h2>
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          this shift
        </span>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          icon={TrendIcon}
          iconClass={trendClass}
          label="Decisions"
          value={thisWeek}
          hint={
            delta === 0
              ? "same as last shift"
              : `${delta > 0 ? "+" : ""}${delta} vs last shift`
          }
        />
        <Stat
          icon={Zap}
          iconClass="text-[var(--action-warning)]"
          label="Avg response"
          value={formatMs(avgResponseSec * 1000)}
          hint="this shift"
        />
        <Stat
          icon={Award}
          iconClass="text-[var(--action-primary)]"
          label="Fastest"
          value={formatMs(bests.fastestResponseMs)}
          hint="personal best"
        />
        <Stat
          icon={Award}
          iconClass="text-[var(--action-info)]"
          label="Session"
          value={sessionDecisions}
          hint="decisions this shift"
        />
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  iconClass,
  label,
  value,
  hint,
}: {
  icon: typeof TrendingUp;
  iconClass: string;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={`size-3.5 ${iconClass}`} aria-hidden />
        <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      </div>
      <p className="text-xl font-semibold tabular-nums text-[var(--text-primary)]">{value}</p>
      <p className="text-[10px] text-[var(--text-muted)]">{hint}</p>
    </div>
  );
}
