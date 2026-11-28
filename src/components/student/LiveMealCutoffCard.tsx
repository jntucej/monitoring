"use client";

import { useMemo } from "react";
import { Clock, AlertCircle } from "lucide-react";

interface LiveMealCutoffCardProps {
  cutoffTime?: string;
  nextMeal?: string;
  isPastCutoff?: boolean;
}

export function LiveMealCutoffCard({
  cutoffTime = "06:00 AM",
  nextMeal = "Breakfast",
  isPastCutoff = false,
}: LiveMealCutoffCardProps) {
  const currentHour = useMemo(() => new Date().getHours(), []);
  const calculatedPast = currentHour >= 6;
  const past = isPastCutoff || calculatedPast;

  return (
    <div className="surface-card bg-bg-surface p-4 rounded-xl border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-action-primary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Live Meal Cutoff
          </h3>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            past
              ? "bg-rose-500/15 text-action-danger"
              : "bg-emerald-500/15 text-action-success"
          }`}
        >
          {past ? "Cutoff Passed" : "Window Open"}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-bold text-text-primary tabular-nums">
            {cutoffTime}
          </span>
          <p className="text-xs text-text-muted mt-0.5">
            Daily cutoff for today&apos;s meal rebates
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-text-secondary block">
            Next: {nextMeal}
          </span>
          <span className="text-[11px] text-text-muted">Dining Hall Main</span>
        </div>
      </div>

      <div className="pt-1 border-t border-border/50">
        <p className="text-xs text-text-muted flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-action-warning shrink-0" />
          <span>
            Meal cancellations must be submitted prior to {cutoffTime} to qualify for monthly mess fee credit.
          </span>
        </p>
      </div>
    </div>
  );
}

export default LiveMealCutoffCard;
