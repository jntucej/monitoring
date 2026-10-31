"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";

export function EmergencyPulse({
  items,
}: {
  items: Array<{ ticket: string; subject: string; age: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border-2 border-[var(--action-danger)]/50 bg-[var(--action-danger)]/5 p-4 sm:p-5">
      <header className="mb-2 flex items-center gap-2">
        <AlertTriangle className="size-4 text-[var(--action-danger)]" />
        <h2 className="text-sm font-semibold text-[var(--action-danger)]">
          Emergency — needs you now
        </h2>
      </header>

      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.ticket}>
            <Link
              href={`/principal/approvals/pending?ticket=${encodeURIComponent(item.ticket)}`}
              className="flex min-h-[44px] items-center gap-2 rounded-lg p-1.5 text-xs transition hover:bg-[var(--action-danger)]/10"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-[var(--text-primary)]">
                {item.subject}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">{item.age}</span>
              <ArrowRight className="size-3 shrink-0 text-[var(--text-muted)]" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
