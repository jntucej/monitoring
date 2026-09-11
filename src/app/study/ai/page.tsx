"use client";

import Link from "next/link";
import { AI_UNITS, ALL_AI_TOPICS } from "./data";
import { ArrowRight, ChevronRight, BrainCircuit, Sparkles, BookOpen } from "lucide-react";

const UNIT_ACCENT: Record<string, { bg: string; text: string }> = {
  I: { bg: "bg-[var(--unit-a)]", text: "text-[var(--unit-a)]" },
  II: { bg: "bg-[var(--unit-b)]", text: "text-[var(--unit-b)]" },
  III: { bg: "bg-[var(--unit-c)]", text: "text-[var(--unit-c)]" },
  IV: { bg: "bg-blue-500", text: "text-blue-400" },
  V: { bg: "bg-pink-500", text: "text-pink-400" },
};

export default function AiDashboard() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-[var(--text-primary)]">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--unit-a)" }}>
          <BrainCircuit className="w-4 h-4" /> Artificial Intelligence • IT522PE
        </p>
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
          🧠 Visual Knowledge & Revision System
        </h1>
        <p className="text-sm text-[var(--text-muted)]">Units I–V • Exam-oriented cheat sheets, active recall self-tests, and visual steppers.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(AI_UNITS).map((u) => {
          const count = ALL_AI_TOPICS.filter((t) => (t.unitNumber || t.unit) === u.unitNumber).length;
          const coreCount = ALL_AI_TOPICS.filter((t) => (t.unitNumber || t.unit) === u.unitNumber && t.tier === "CORE").length;
          const acc = UNIT_ACCENT[u.unitNumber] || { bg: "bg-emerald-500", text: "text-emerald-400" };

          return (
            <Link key={u.id} href={`/study/ai/cheat`} className="glass-card rounded-2xl p-5 space-y-3 group border border-[var(--border)] hover:border-[var(--action-primary)]/50 transition-all shadow-md">
              <div className="flex items-center justify-between">
                <span className={`w-8 h-8 rounded-xl ${acc.bg} text-white font-extrabold text-xs flex items-center justify-center shadow-md`}>
                  {u.unitNumber}
                </span>
                <div className="flex gap-1 text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    🎯 {coreCount} Core
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)]">
                    {count} total
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-base text-[var(--text-primary)]">{u.title}</h3>
                <p className="text-xs font-semibold text-[var(--text-muted)]">{u.subtitle}</p>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2">{u.description}</p>
              </div>

              <div className={`flex items-center text-xs font-bold gap-1 ${acc.text}`}>
                Explore cheat sheets <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/study/ai/cheat" className="glass-card rounded-2xl p-5 space-y-2 group border border-[var(--border)] hover:border-[var(--action-primary)]/50 transition-all">
          <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
            📝 Fast Revision & Recall Mode <ArrowRight className="w-4 h-4 text-[var(--unit-a)] group-hover:translate-x-0.5 transition-transform" />
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            All Units I–V in one searchable, tabbed 3-column dashboard with ⚡ Revision Mode and 🧠 Active Recall Self-Tests.
          </p>
        </Link>

        <div className="glass-card rounded-2xl p-5 space-y-2 border border-[var(--border)]">
          <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
            🎮 Interactive Visual Steppers
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Step through BFS/DFS/UCS/Greedy/A* frontiers, Alpha-Beta pruning game trees, CSP map-colouring, and Unification MGU boards step by step.
          </p>
        </div>
      </div>
    </div>
  );
}
