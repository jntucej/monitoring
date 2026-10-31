"use client";

import { Lightbulb } from "lucide-react";

export function InsightCard({
  thisWeek,
  lastWeek,
  avgResponseSec,
  chainTotal,
}: {
  thisWeek: number;
  lastWeek: number;
  avgResponseSec: number;
  chainTotal: number;
}) {
  let title = "Your leadership pace";
  let body = "Make a few decisions to unlock insights about your impact.";

  if (chainTotal > 0) {
    title = `${chainTotal} people move when you decide`;
    body =
      "Every approval cascades — students get their passes, faculty get their leave, exam candidates clear their halls. The faster you decide, the faster the chain moves.";
  } else if (thisWeek > lastWeek && lastWeek > 0) {
    const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    title = "You're clearing more than last week";
    body = `You've handled ${pct}% more strategic decisions than this time last week. Average response: ${Math.round(avgResponseSec / 60)} minutes.`;
  } else if (lastWeek > thisWeek && lastWeek > 0) {
    title = "A lighter week at the top";
    body = `Fewer items reached your desk this week — delegations are absorbing the load. When items do arrive, they move in ${Math.round(avgResponseSec / 60)} minutes.`;
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
