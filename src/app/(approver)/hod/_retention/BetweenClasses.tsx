"use client";

import { Clock, ArrowRight } from "lucide-react";

export interface ScheduleSlot {
  id: string;
  subject: string;
  section: string;
  room: string | null;
  startsAt: string;
  endsAt: string;
  marked: boolean;
}

/**
 * The HOD-specific "teaching rhythm" widget.
 *
 * Reads today's class schedule and shows the next period with a countdown
 * to the next free window. If the HOD has 27 minutes before the next class,
 * this widget tells them "clear 3 approvals now". If they're between two
 * periods back to back, it says "next window: 11:45 — 12:30".
 */
export function BetweenClasses({
  schedule,
  pendingCount,
}: {
  schedule: ScheduleSlot[];
  pendingCount: number;
}) {
  const now = Date.now();

  // Find current and next class
  const upcoming = schedule
    .map((s) => ({ ...s, startMs: timeToMs(s.startsAt), endMs: timeToMs(s.endsAt) }))
    .filter((s) => s.endMs > now)
    .sort((a, b) => a.startMs - b.startMs);

  const current = upcoming.find((s) => s.startMs <= now && s.endMs > now);
  const next = upcoming.find((s) => s.startMs > now);

  // No classes today
  if (schedule.length === 0) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <header className="mb-2 flex items-center gap-2">
          <Clock className="size-4 text-[var(--action-info)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Teaching day</h2>
        </header>
        <p className="text-xs text-[var(--text-muted)]">No classes scheduled today.</p>
      </section>
    );
  }

  const timeUntilNext = next ? next.startMs - now : null;
  const canClearApprovals = timeUntilNext !== null && timeUntilNext > 8 * 60_000;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-[var(--action-info)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Teaching day</h2>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          {schedule.filter((s) => s.marked).length}/{schedule.length} marked
        </span>
      </header>

      {current && (
        <div className="mb-3 rounded-lg bg-[var(--action-primary)]/10 p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[var(--action-primary)]">
            In class now
          </p>
          <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
            {current.subject} · {current.section}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {current.room ?? "No room"} · ends {current.endsAt}
          </p>
        </div>
      )}

      {next && canClearApprovals && (
        <div className="mb-3 rounded-lg bg-[var(--action-warning)]/10 p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[var(--action-warning)]">
            You have time
          </p>
          <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
            {Math.round(timeUntilNext! / 60_000)} minutes until {next.subject}
          </p>
          {pendingCount > 0 && (
            <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
              {pendingCount} approval{pendingCount === 1 ? "" : "s"} waiting.
            </p>
          )}
        </div>
      )}

      {next && !canClearApprovals && (
        <div className="mb-3 rounded-lg bg-[var(--bg-elevated)] p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Next class
          </p>
          <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">
            {next.subject} · {next.section}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Starts {next.startsAt} · {next.room ?? "No room"}
          </p>
        </div>
      )}

      {/* Schedule strip */}
      <ul className="space-y-1">
        {upcoming.slice(0, 4).map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-[11px]">
            <span
              className={`size-1.5 shrink-0 rounded-full ${
                s.marked
                  ? "bg-[var(--action-primary)]"
                  : "bg-[var(--text-muted)]"
              }`}
            />
            <span className="tabular-nums text-[var(--text-muted)]">{s.startsAt}</span>
            <span className="flex-1 truncate text-[var(--text-secondary)]">
              {s.subject}
            </span>
            {s.marked && (
              <span className="text-[10px] text-[var(--action-primary)]">marked</span>
            )}
          </li>
        ))}
      </ul>

      {pendingCount > 0 && (
        <a
          href="/hod/approvals/pending"
          className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-[var(--action-primary)]/30 bg-[var(--action-primary)]/5 px-3 py-2 text-xs font-medium text-[var(--action-primary)] transition hover:bg-[var(--action-primary)]/10"
        >
          Clear {pendingCount} approval{pendingCount === 1 ? "" : "s"} now
          <ArrowRight className="size-3" />
        </a>
      )}
    </section>
  );
}

function timeToMs(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}
