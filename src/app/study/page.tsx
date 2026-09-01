"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StudyHeader } from "./layout";
import { ChevronRight, FileText, FlaskConical, Clock, BrainCircuit } from "lucide-react";

const RESOURCES = [
  {
    href: "/study/ml/cheat",
    title: "🧠 ML Cheat Sheets — Units I–III",
    description: "Dense formula cards, algorithm steps, and memory triggers. Scan in under 30s.",
    icon: BrainCircuit,
    accent: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
  },
  {
    href: "/study/notes",
    title: "Study Notes",
    description: "Core concepts and reference material, organized by topic.",
    icon: FileText,
    accent: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
  },
  {
    href: "/study/practice",
    title: "Practice Sets",
    description: "Problems to solve with worked solutions for self-checking.",
    icon: FlaskConical,
    accent: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
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
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${r.bg}`}>
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

        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] justify-center pt-4">
          <Clock className="w-3.5 h-3.5" />
          <span>Access lasts for this browser tab session. Closing the tab signs you out.</span>
        </div>
      </main>
    </>
  );
}
