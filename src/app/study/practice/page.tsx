"use client";

import { StudyHeader } from "../layout";
import { FlaskConical } from "lucide-react";

const SETS = [
  {
    title: "Practice Set 1 — Basics",
    body: "Placeholder practice problems. Replace with your real question sets — each card is one set with its solutions described below it.",
  },
  {
    title: "Practice Set 2 — Advanced",
    body: "Another placeholder. Structure it however works for the group: questions first, solutions hidden at the bottom, or links out to PDFs you host elsewhere.",
  },
];

export default function PracticePage() {
  return (
    <>
      <StudyHeader title="Practice Sets" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-emerald-400" />
          Practice Sets
        </h1>
        {SETS.map((s) => (
          <article key={s.title} className="glass-card rounded-2xl p-5 space-y-2">
            <h2 className="font-bold text-sm text-[var(--text-primary)]">{s.title}</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{s.body}</p>
          </article>
        ))}
      </main>
    </>
  );
}
