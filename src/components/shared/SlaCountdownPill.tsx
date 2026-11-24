"use client";

import { Clock, AlertTriangle } from "lucide-react";

export interface SlaCountdownPillProps {
  deadline?: string | null;
  closedLabel?: string;
  fallbackLabel?: string;
}

/**
 * SlaCountdownPill — live time-pressure & urgency indicator:
 * "24m left", "Due in 2h", "Overdue by 35m", or fallbackLabel,
 * paired with ok / warn / critical visual severity.
 */
export function SlaCountdownPill({
  deadline,
  closedLabel,
  fallbackLabel = "No SLA",
}: SlaCountdownPillProps) {
  if (!deadline) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-bg-elevated px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">
        <Clock className="size-3 shrink-0" />
        {fallbackLabel}
      </span>
    );
  }

  const ms = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(ms)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-bg-elevated px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">
        <Clock className="size-3 shrink-0" />
        {fallbackLabel}
      </span>
    );
  }

  const mins = Math.round(ms / 60_000);
  if (mins <= 0) {
    const overMins = Math.abs(mins);
    const label =
      closedLabel ??
      (overMins < 60
        ? `Overdue by ${overMins}m`
        : `Overdue by ${Math.round(overMins / 60)}h`);
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-action-danger/15 px-2.5 py-0.5 text-[11px] font-semibold text-action-danger">
        <AlertTriangle className="size-3 shrink-0" />
        {label}
      </span>
    );
  }

  if (mins < 60) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-action-warning">
        <Clock className="size-3 shrink-0" />
        {mins}m left
      </span>
    );
  }

  const hrs = Math.round(mins / 60);
  const toneCls =
    hrs <= 3
      ? "bg-amber-500/15 text-action-warning font-semibold"
      : "bg-action-success/15 text-action-success font-medium";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] ${toneCls}`}>
      <Clock className="size-3 shrink-0" />
      Due in {hrs}h
    </span>
  );
}

export default SlaCountdownPill;
