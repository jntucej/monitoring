"use client";

import { Users, GraduationCap, ArrowRight } from "lucide-react";

export function ChainImpact({
  students,
  faculty,
  total,
}: {
  students: number;
  faculty: number;
  total: number;
}) {
  if (total === 0) {
    return (
      <section className="rounded-2xl border border-[var(--action-primary)]/30 bg-[var(--action-primary)]/5 p-4 sm:p-5">
        <p className="text-sm font-medium text-[var(--action-primary)]">
          No one is waiting on you
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Your queue is clear — the chain is moving.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--action-warning)]/30 bg-[var(--action-warning)]/5 p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <Users className="size-4 text-[var(--action-warning)]" />
        <h2 className="text-sm font-semibold text-[var(--action-warning)]">
          {total} {total === 1 ? "person is" : "people are"} blocked on you
        </h2>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="size-4 text-[var(--text-muted)]" />
          <div>
            <p className="text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
              {students}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">Students</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Users className="size-4 text-[var(--text-muted)]" />
          <div>
            <p className="text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
              {faculty}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">Faculty & HODs</p>
          </div>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
        Every approval you clear moves {total} people forward
        <ArrowRight className="size-3" />
      </p>
    </section>
  );
}
