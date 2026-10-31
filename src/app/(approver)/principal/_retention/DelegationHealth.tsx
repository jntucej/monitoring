"use client";

import Link from "next/link";
import { UserCog, AlertTriangle, CheckCircle2 } from "lucide-react";

export function DelegationHealth({
  active,
  expiringSoon,
}: {
  active: number;
  expiringSoon: number;
}) {
  const healthy = active > 0 && expiringSoon === 0;
  const warning = active > 0 && expiringSoon > 0;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCog className="size-4 text-[var(--action-info)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Delegation health
          </h2>
        </div>
        <Link
          href="/principal/governance/delegations"
          className="inline-flex min-h-[44px] items-center text-[11px] text-[var(--action-primary)] hover:underline"
        >
          Manage
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Active
          </p>
          <p className="text-2xl font-semibold tabular-nums text-[var(--action-primary)]">
            {active}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            Expiring
          </p>
          <p
            className={`text-2xl font-semibold tabular-nums ${
              expiringSoon > 0
                ? "text-[var(--action-warning)]"
                : "text-[var(--text-muted)]"
            }`}
          >
            {expiringSoon}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs">
        {healthy && (
          <>
            <CheckCircle2 className="size-3.5 text-[var(--action-primary)]" />
            <span className="text-[var(--text-secondary)]">
              Delegations are current — the chain runs even when you step out.
            </span>
          </>
        )}
        {warning && (
          <>
            <AlertTriangle className="size-3.5 text-[var(--action-warning)]" />
            <span className="text-[var(--text-secondary)]">
              {expiringSoon} delegation{expiringSoon === 1 ? "" : "s"} expiring in 3 days.
            </span>
          </>
        )}
        {!healthy && !warning && (
          <>
            <AlertTriangle className="size-3.5 text-[var(--text-muted)]" />
            <span className="text-[var(--text-secondary)]">
              No active delegations — anything urgent waits until you return.
            </span>
          </>
        )}
      </div>
    </section>
  );
}
