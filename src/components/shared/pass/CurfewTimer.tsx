/**
 * shared/pass/CurfewTimer — live countdown to curfew (hosteller only).
 * Polls every 30s. Shows "in Xh Ym" or "curfew breached".
 */

"use client";

import { useEffect, useState } from "react";
import { Moon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersona } from "@/hooks/usePersona";

/** Campus default curfew (IST). Override via campus config in a later phase. */
const DEFAULT_CURFEW_HHMM = "22:00";

export interface CurfewTimerProps {
  /** Override the curfew time (HH:MM, campus-local). */
  curfewTime?: string;
  /** If set, show "must return by" against an expected-return time instead. */
  expectedReturnAt?: string;
  className?: string;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function CurfewTimer({ curfewTime, expectedReturnAt, className }: CurfewTimerProps) {
  const persona = usePersona();
  const [, setTick] = useState(0);

  // Re-render every 30s to keep the countdown live.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Only hostellers get a curfew timer.
  if (persona !== "hosteller") return null;

  const targetHHMM = expectedReturnAt ? expectedReturnAt.slice(11, 16) : (curfewTime ?? DEFAULT_CURFEW_HHMM);
  const targetMin = toMinutes(targetHHMM);
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const diffMin = targetMin - nowMin;

  const breached = diffMin < 0;
  const label = breached
    ? "curfew breached"
    : diffMin < 60
      ? `in ${diffMin} min`
      : `in ${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;

  return (
    <div
      className={cn(
        "rounded-xl border p-3 flex items-center gap-3",
        breached
          ? "border-rose-500/30 bg-rose-500/10"
          : "border-border bg-bg-elevated",
        className
      )}
    >
      {breached ? (
        <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
      ) : (
        <Moon className="h-5 w-5 text-rose-500/70 shrink-0" />
      )}
      <div className="min-w-0">
        <p className={cn("text-xs font-semibold", breached ? "text-rose-600" : "text-text-primary")}>
          {breached ? "Past curfew" : "Curfew"}
          {expectedReturnAt && !breached ? " / return" : ""}
        </p>
        <p className={cn("text-sm font-bold tabular-nums", breached ? "text-rose-600" : "text-text-primary")}>
          {targetHHMM}
        </p>
      </div>
      <div className="ml-auto text-right">
        <p className={cn("text-xs font-semibold tabular-nums", breached ? "text-rose-500" : "text-text-muted")}>
          {label}
        </p>
        {expectedReturnAt && (
          <p className="text-[10px] text-text-muted">expected return</p>
        )}
      </div>
    </div>
  );
}

export default CurfewTimer;
