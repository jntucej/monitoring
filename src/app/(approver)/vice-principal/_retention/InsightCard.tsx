"use client";

import { Lightbulb, TrendingUp } from "lucide-react";

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} minutes` : `${Math.floor(m / 60)} hours`;
}

export function InsightCard({
  thisWeek,
  lastWeek,
  avgResponseSec,
}: {
  thisWeek: number;
  lastWeek: number;
  avgResponseSec: number;
}) {
  let title = "Your pace";
  let body = "Not enough data yet — make a few decisions to unlock insights.";

  if (thisWeek > 0 && lastWeek > 0) {
    const delta = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    if (delta >= 20) {
      title = "You're ahead of the curve";
      body = `You've handled ${delta}% more requests than this time last week. Average response time: ${formatMs(avgResponseSec * 1000)}.`;
    } else if (delta <= -20) {
      title = "Volume is down this week";
      body = `Fewer requests than last week (${delta}%). Your average response is still ${formatMs(avgResponseSec * 1000)}.`;
    } else {
      title = "Steady pace";
      body = `Your throughput is consistent with last week. Average response: ${formatMs(avgResponseSec * 1000)}.`;
    }
  } else if (avgResponseSec > 0) {
    title = "Your response time";
    body = `Average time to decide: ${formatMs(avgResponseSec * 1000)}. Keep it up and you'll stay ahead of the Principal's queue.`;
  }

  return (
    <section className="rounded-2xl border border-[var(--action-info)]/30 bg-[var(--action-info)]/5 p-4 sm:p-5">
      <header className="mb-2 flex items-center gap-2">
        <Lightbulb className="size-4 text-[var(--action-info)]" />
        <h2 className="text-sm font-semibold text-[var(--action-info)]">{title}</h2>
      </header>
      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{body}</p>
    </section>
  );
}
