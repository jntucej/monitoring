"use client";

import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { SlaBadge } from "@/components/approver/SlaBadge";

export interface UpcomingItem {
  ticket: string;
  subject: string;
  slaDeadline: string;
  workflowType: string;
}

export function UpcomingPreview({ items }: { items: UpcomingItem[] }) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
        <header className="mb-2 flex items-center gap-2">
          <Clock className="size-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Due soon</h2>
        </header>
        <p className="text-xs text-[var(--text-muted)]">
          Nothing due in the next 24 hours.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <Clock className="size-4 text-[var(--action-warning)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Due in next 24h
        </h2>
      </header>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.ticket}>
            <Link
              href={`/hod/approvals/pending?ticket=${encodeURIComponent(item.ticket)}`}
              className="flex items-center gap-2 rounded-lg p-2 text-xs transition hover:bg-[var(--bg-elevated)]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[var(--text-primary)]">{item.subject}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{item.ticket}</p>
              </div>
              <SlaBadge slaDeadline={item.slaDeadline} status="PENDING" />
              <ArrowRight className="size-3 shrink-0 text-[var(--text-muted)]" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
