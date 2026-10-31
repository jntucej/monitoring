"use client";

import { ArrowUpRight, Network } from "lucide-react";

export function PrincipalBridge({
  myPending,
  principalPending,
}: {
  myPending: number;
  principalPending: number;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-elevated)] p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <Network className="size-4 text-[var(--action-info)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Your chain</h2>
      </header>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">You</p>
          <p className="text-2xl font-semibold tabular-nums text-[var(--action-primary)]">
            {myPending}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">in your queue</p>
        </div>
        <ArrowUpRight className="size-5 shrink-0 text-[var(--text-muted)]" />
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Principal</p>
          <p className="text-2xl font-semibold tabular-nums text-[var(--text-info)]">
            {principalPending}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">waiting on you</p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
        {myPending === 0
          ? "Your queue is clear — you're not blocking the Principal."
          : `Every approval you clear moves the whole chain forward. ${myPending} left to unblock.`}
      </p>
    </section>
  );
}
