"use client";

import Link from "next/link";
import { StudyHeader } from "./layout";
import { ChevronRight, FileText, BrainCircuit, BookOpen, Zap } from "lucide-react";

const RESOURCES = [
  {
    href: "/study/ai/cheat",
    title: "🧠 AI Cheat Sheets — Artificial Intelligence",
    description: "Interactive cheat sheets for Units I–III. Search algorithms, alpha-beta, CSP, logic, FOL, unification.",
    icon: BrainCircuit,
    accent: "text-[var(--unit-a)]",
    bg: "var(--unit-a-soft)",
    border: "var(--unit-a)",
  },
  {
    href: "/study/ml/cheat",
    title: "🧠 ML Cheat Sheets — IT503PC",
    description: "Visual cheat sheets for Units I–III. Formulas, algorithms, comparisons, memory triggers.",
    icon: BrainCircuit,
    accent: "text-[var(--unit-a)]",
    bg: "var(--unit-a-soft)",
    border: "var(--unit-a)",
  },
  {
    href: "/study/pdc/cheat",
    title: "⚡ PDC Cheat Sheets — Parallel & Distributed Computing",
    description: "Interactive cheat sheets for Units I–III. Amdahl slider, Flynn grid, pipeline diagrams, memory consistency.",
    icon: Zap,
    accent: "text-[var(--unit-b)]",
    bg: "var(--unit-b-soft)",
    border: "var(--unit-b)",
  },
  {
    href: "/study/ml",
    title: "📊 ML Knowledge Dashboard",
    description: "Full visual knowledge system with topic pages, diagrams, and exam points.",
    icon: BookOpen,
    accent: "text-[var(--unit-a)]",
    bg: "var(--unit-a-soft)",
    border: "var(--unit-a)",
  },
  {
    href: "/study/notes",
    title: "Study Notes",
    description: "Core concepts and reference material, organized by topic.",
    icon: FileText,
    accent: "text-[var(--unit-c)]",
    bg: "var(--unit-c-soft)",
    border: "var(--unit-c)",
  },
];

export default function StudyIndexPage() {
  return (
    <>
      <StudyHeader title="Study Portal" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome, Candidate 👋</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Pick a resource below to start learning. Everything here is shared for the group.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {RESOURCES.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="glass-card rounded-2xl p-5 text-left space-y-3 group cursor-pointer block"
            >
              <div
                className="w-10 h-10 rounded-xl border flex items-center justify-center"
                style={{ background: r.bg, borderColor: r.border }}
              >
                <r.icon className={`w-5 h-5 ${r.accent}`} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-sm text-[var(--text-primary)]">{r.title}</h2>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{r.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
