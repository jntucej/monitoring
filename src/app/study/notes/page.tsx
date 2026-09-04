"use client";

import { StudyHeader } from "../layout";
import { FileText } from "lucide-react";

const NOTES = [
  {
    title: "Getting Started",
    body: "This is a placeholder note. Replace this content with your real study material — concepts, summaries, links, anything the group needs.",
  },
  {
    title: "How to Edit This Page",
    body: "Open src/app/study/notes/page.tsx and edit the NOTES array at the top. Add or remove entries as your material grows — the cards render automatically.",
  },
  {
    title: "Sharing Tips",
    body: "Keep each note short and focused. One topic per card makes it easier for everyone to scan and find what they need.",
  },
];

export default function StudyNotesPage() {
  return (
    <>
      <StudyHeader title="Study Notes" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <FileText className="w-5 h-5 text-[var(--unit-a)]" />
          Study Notes
        </h1>
        {NOTES.map((n) => (
          <article key={n.title} className="glass-card rounded-2xl p-5 space-y-2">
            <h2 className="font-bold text-sm text-[var(--text-primary)]">{n.title}</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{n.body}</p>
          </article>
        ))}
      </main>
    </>
  );
}
