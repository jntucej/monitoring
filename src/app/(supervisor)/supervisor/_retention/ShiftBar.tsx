"use client";

import { Clock, ArrowRight } from "lucide-react";

function fmtDuration(ms: number): string {
  if (ms < 0) return "ended";
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function ShiftBar({
  startedAt,
  endsAt,
  escalationsOpen,
  incidentsOpen,
}: {
  startedAt: string | null;
  endsAt: string | null;
  escalationsOpen: number;
  incidentsOpen: number;
}) {
  if (!startedAt) {
    return (
      <section className="rounded-2xl border border-border bg-bg-surface p-4 sm:p-5">
        <p className="text-sm font-medium text-text-primary">No active shift</p>
        <p className="mt-1 text-xs text-text-muted">
          Your shift hasn&#39;t started yet.
        </p>
      </section>
    );
  }

  const now = Date.now();
  const startMs = new Date(startedAt).getTime();
  const endMs = endsAt ? new Date(endsAt).getTime() : startMs + 8 * 3600_000;
  const elapsed = now - startMs;
  const remaining = endMs - now;
  const pct = Math.max(0, Math.min(100, (elapsed / (endMs - startMs)) * 100));

  const needsAction = escalationsOpen + incidentsOpen;
  const message =
    needsAction === 0
      ? "All clear — nothing needs you right now."
      : needsAction === 1
      ? "1 item to clear before handover."
      : `${needsAction} items to clear before handover.`;

  return (
    <section className="rounded-2xl border border-border bg-bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-5 items-center justify-center rounded-full bg-action-primary/10">
            <Clock className="size-5 text-action-primary" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">
              Shift in progress
            </p>
            <p className="text-xs text-text-muted">
              {fmtDuration(elapsed)} in · {fmtDuration(remaining)} to handover
            </p>
          </div>
        </div>
        <span className="text-2xl font-semibold tabular-nums text-action-primary">
          {Math.round(pct)}%
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-elevated">
        <div
          className="h-full rounded-full bg-action-primary transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-text-secondary">{message}</span>
        {needsAction > 0 && (
          <span className="flex items-center gap-1 text-action-warning">
            Clear now <ArrowRight className="size-3" />
          </span>
        )}
      </div>
    </section>
  );
}
