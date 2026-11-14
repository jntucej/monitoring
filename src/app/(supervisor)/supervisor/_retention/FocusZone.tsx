"use client";

import Link from "next/link";
import { Target, ArrowRight, Clock } from "lucide-react";
import { SlaBadge } from "@/components/approver/SlaBadge";

export interface FocusItem {
  id: string;
  ticket: string;
  subject: string;
  slaDeadline: string | null;
  age: string;
  href: string;
}

export function FocusZone({
  item,
  onEnterFocus,
}: {
  item: FocusItem | null;
  onEnterFocus: () => void;
}) {
  if (!item) {
    return (
      <section className="rounded-2xl border border-action-primary/30 bg-action-primary/5 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-4 items-center justify-center rounded-full bg-action-primary/20">
            <Target className="size-4 text-action-primary" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-action-primary">Queue is clear</p>
            <p className="text-xs text-text-secondary">
              Nothing needs you right now — enjoy the calm.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const isUrgent = item.slaDeadline
    ? new Date(item.slaDeadline).getTime() - Date.now() < 4 * 3600_000
    : false;

  return (
    <section
      className={`rounded-2xl border-2 p-4 sm:p-5 ${
        isUrgent
          ? "border-action-danger/40 bg-action-danger/5"
          : "border-action-primary/30 bg-action-primary/5"
      }`}
    >
      <header className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
          <Target className="size-3" />
          Do this next
        </p>
        {item.slaDeadline && (
          <SlaBadge slaDeadline={item.slaDeadline} status="PENDING" />
        )}
      </header>

      <p className="text-base font-semibold leading-snug text-text-primary sm:text-lg">
        {item.subject}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
        <Clock className="size-3" />
        {item.age} · {item.ticket}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={onEnterFocus}
          className="flex min-h11 flex-1 items-center justify-center gap-2 rounded-xl bg-action-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-action-primary/90"
        >
          Open in focus mode
          <ArrowRight className="size-4" />
        </button>
        <Link
          href={item.href}
          className="flex min-h11 flex-1 items-center justify-center rounded-xl border border-border bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-bg-elevated"
        >
          View details
        </Link>
      </div>
    </section>
  );
}
