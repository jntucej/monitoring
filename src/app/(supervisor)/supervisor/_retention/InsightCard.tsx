"use client";

import { Lightbulb } from "lucide-react";

export function InsightCard({
  escalationsOpen,
  incidentsOpen,
  gatesOnline,
  totalGates,
  securityOnDuty,
}: {
  escalationsOpen: number;
  incidentsOpen: number;
  gatesOnline: number;
  totalGates: number;
  securityOnDuty: number;
}) {
  let title = "Your shift";
  let body = "A calm shift is a good shift. Keep watching the gates.";

  if (incidentsOpen > 0) {
    title = `${incidentsOpen} open incident${incidentsOpen === 1 ? "" : "s"} on your watch`;
    body = `Your team is the front line. Assign the closest security guard, log the resolution, and the shift stays clean.`;
  } else if (escalationsOpen > 0) {
    title = `${escalationsOpen} escalation${escalationsOpen === 1 ? "" : "s"} need${escalationsOpen === 1 ? "" : "s"} your call`;
    body = `The operator has done their job. The next step is yours. Clearing these before handover keeps the shift clean.`;
  } else if (gatesOnline < totalGates) {
    title = `${totalGates - gatesOnline} gate${totalGates - gatesOnline === 1 ? "" : "s"} need attention`;
    body = `A gate with no guard is a gate nobody is watching. A five-minute call to the assigned worker keeps the campus covered.`;
  } else if (securityOnDuty > 0) {
    title = `${securityOnDuty} security on duty — all gates staffed`;
    body = `Everyone is where they should be. This is the shift you want to hand over.`;
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
