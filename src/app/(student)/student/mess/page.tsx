"use client";

import Link from "next/link";
import { MyMealHistory } from "@/components/shared/meals/MyMealHistory";

/* S7: mess landing — 4-card grid instead of a blind redirect to /reviews.
   Each card is a plain link; the destination pages already exist. */

const cards = [
  { title: "Menu & Token", href: "/student/mess/token", sub: "Today's menu and your meal token" },
  { title: "Reviews", href: "/student/mess/reviews", sub: "Rate today's meals" },
  { title: "Special events", href: "/student/mess/special", sub: "Special meals and notices" },
  { title: "Bill", href: "/student/mess-bill", sub: "Your running mess balance" },
];

export default function StudentMessLanding() {
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
        <h2 className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wider">My meal history</h2>
        <MyMealHistory limit={14} />
      </div>
    </div>
  );
}
