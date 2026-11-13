"use client";

import { Award, Zap, Users, ShieldCheck } from "lucide-react";
import { usePrincipalRetention } from "@/stores/principalRetentionStore";

function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h`;
}

export function StrategicScorecard({
  thisWeek,
  lastWeek,
  avgResponseSec,
}: {
  thisWeek: number;
  lastWeek: number;
  avgResponseSec: number;
}) {
  const bests = usePrincipalRetention((s) => s.bests);
  const unblocked = usePrincipalRetention((s) => s.unblockedToday);

  return (
    <section className="rounded-2xl border border-border bg-bg-surface p-4 sm:p-5">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">
          Your impact
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-text-muted">
          this week
        </span>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          icon={ShieldCheck}
          iconClass="text-action-primary"
          label="Decisions"
          value={thisWeek}
          hint={
            lastWeek > 0
              ? `${thisWeek >= lastWeek ? "+" : ""}${thisWeek - lastWeek} vs last week`
              : "this week"
          }
        />
        <Stat
          icon={Users}
          iconClass="text-action-info"
          label="Unblocked today"
          value={unblocked}
          hint={`${bests.biggestUnblockCount} best`}
        />
        <Stat
          icon={Zap}
          iconClass="text-action-warning"
          label="Fastest"
          value={fmtMs(bests.fastestResponseMs)}
          hint="personal best"
        />
        <Stat
          icon={Award}
          iconClass="text-action-primary"
          label="Avg response"
          value={fmtMs(avgResponseSec * 1000)}
          hint="this week"
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
  icon: typeof Award;
  iconClass: string;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={`size-3.5 ${iconClass}`} aria-hidden />
        <p className="text-[10px] uppercase tracking-wider text-text-muted">
          {label}
        </p>
      </div>
      <p className="text-xl font-semibold tabular-nums text-text-primary">
        {value}
      </p>
      <p className="text-[10px] text-text-muted">{hint}</p>
    </div>
  );
}
