"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Users, MessageSquare, ArrowRight } from "lucide-react";

export interface SatisfactionSignal {
  id: string;
  source: "mess" | "complaint" | "campus";
  rating: number; // 1..5
  tag: string;
  comment?: string;
  anonymous?: boolean;
  authorLabel?: string;
  targetHref?: string;
  createdAt?: string;
}

export function computeSatisfactionSummary(signals: SatisfactionSignal[]) {
  if (signals.length === 0) {
    return { avg: 0, lowCount: 0, total: 0 };
  }
  const sum = signals.reduce((acc, s) => acc + s.rating, 0);
  const lowCount = signals.filter((s) => s.rating <= 2).length;
  return {
    avg: Math.round((sum / signals.length) * 10) / 10,
    lowCount,
    total: signals.length,
  };
}

export function SatisfactionOverviewPanel({
  onCampusCount,
  totalPeopleCount,
  signals = [],
}: {
  onCampusCount: number;
  totalPeopleCount: number;
  signals?: SatisfactionSignal[];
}) {
  const [filter, setFilter] = useState<"all" | "low">("all");
  const summary = computeSatisfactionSummary(signals);
  const visibleSignals =
    filter === "low" ? signals.filter((s) => s.rating <= 2) : signals;

  return (
    <section
      data-testid="satisfaction-overview-panel"
      className="surface-card bg-bg-surface p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Users className="size-4 text-action-primary" />
            People Standing &amp; Campus Satisfaction
          </h2>
          <p className="text-xs text-text-muted">
            {onCampusCount} on campus of {totalPeopleCount} registered ·{" "}
            {summary.total > 0
              ? `${summary.avg}/5 avg satisfaction (${summary.lowCount} low-rating follow-ups)`
              : "No recent rating signals"}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
              filter === "all"
                ? "border-action-primary bg-action-primary/10 text-action-primary"
                : "border-border bg-bg-base text-text-secondary"
            }`}
          >
            All ({signals.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("low")}
            className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
              filter === "low"
                ? "border-action-danger bg-rose-500/10 text-action-danger"
                : "border-border bg-bg-base text-text-secondary"
            }`}
          >
            Low Ratings ({summary.lowCount})
          </button>
        </div>
      </div>

      {visibleSignals.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {visibleSignals.slice(0, 4).map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-border bg-bg-base p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-primary">
                  <Star className="size-3.5 text-amber-500 fill-amber-500" />
                  {s.rating}/5 · {s.tag}
                </span>
                <span className="text-[11px] text-text-muted capitalize">{s.source}</span>
              </div>
              {s.comment && (
                <p className="text-xs text-text-secondary flex items-start gap-1.5">
                  <MessageSquare className="size-3.5 shrink-0 mt-0.5 text-text-muted" />
                  <span>{s.comment}</span>
                </p>
              )}
              <div className="flex items-center justify-between text-[11px] text-text-muted pt-1">
                <span>{s.anonymous ? "Anonymous" : s.authorLabel ?? "Student"}</span>
                {s.targetHref && (
                  <Link
                    href={s.targetHref}
                    className="inline-flex items-center gap-1 font-semibold text-action-primary hover:underline"
                  >
                    Open <ArrowRight className="size-3" />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
