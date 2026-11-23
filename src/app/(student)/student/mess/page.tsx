"use client";

import { useState } from "react";
import Link from "next/link";
import { MyMealHistory } from "@/components/shared/meals/MyMealHistory";
import { SelfActionLoop, type NextActionStep } from "@/components/nav/level0/SelfActionLoop";
import { UtensilsCrossed } from "lucide-react";

/* S7: mess landing — 4-card grid instead of a blind redirect to /reviews.
   Each card is a plain link; the destination pages already exist. */

const cards = [
  { title: "Menu & Token", href: "/student/mess/token", sub: "Today's menu and your meal token" },
  { title: "Reviews", href: "/student/mess/reviews", sub: "Rate today's meals" },
  { title: "Special events", href: "/student/mess/special", sub: "Special meals and notices" },
  { title: "Bill", href: "/student/mess-bill", sub: "Your running mess balance" },
];

export default function StudentMessLanding() {
  // Level-0 record pivot: the most-recent meal currently in focus. When a
  // meal row is tapped it becomes the record the mess page pivots around.
  const [focusMeal, setFocusMeal] = useState<string | null>(null);

  const messSteps: NextActionStep[] = focusMeal
    ? [
        { label: "Rate Meal", href: "/student/mess/reviews" },
        { label: "Report Mess Issue", href: "/student/complaints/new", badge: "mess" },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="surface-card bg-bg-surface p-4 hover:bg-action-primary/5 transition-colors"
          >
            <p className="text-sm font-bold text-text-primary">{c.title}</p>
            <p className="text-xs text-text-muted mt-0.5">{c.sub}</p>
          </Link>
        ))}
      </div>

      {/* The meal loop (S4): my meal history — what I ate, rate it,
          one-tap complaint. */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">My meal history</h2>
          {/* Level-0 pivot: tap to focus the most-recent meal so its
              next-step actions surface below. */}
          <button
            type="button"
            onClick={() => setFocusMeal(focusMeal ? null : "")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-bg-elevated px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:text-action-primary transition-colors motion-reduce:transition-none"
          >
            <UtensilsCrossed className="h-3.5 w-3.5" />
            {focusMeal ? "Clear focus" : "Focus a meal"}
          </button>
        </div>
        <MyMealHistory limit={14} />
      </div>

      {/* Level-0 record pivot: when a meal is in focus, surface the
          Rate Meal / Report Mess Issue next steps. */}
      {focusMeal && (
        <SelfActionLoop
          title={`Meal ${focusMeal}`}
          meta="Focused meal — where to take it next"
          steps={messSteps}
        />
      )}
    </div>
  );
}
