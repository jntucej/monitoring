"use client";

import Link from "next/link";
import { AI_UNITS, ALL_AI_TOPICS } from "./data";
import { ArrowRight, ChevronRight, BrainCircuit } from "lucide-react";

const UNIT_ACCENT: Record<string, { text: string; border: string; dot: string; soft: string }> = {
  I: { text: "text-[var(--unit-a)]", border: "border-[var(--unit-a)]", dot: "bg-[var(--unit-a)]", soft: "var(--unit-a-soft)" },
  II: { text: "text-[var(--unit-b)]", border: "border-[var(--unit-b)]", dot: "bg-[var(--unit-b)]", soft: "var(--unit-b-soft)" },
  III: { text: "text-[var(--unit-c)]", border: "border-[var(--unit-c)]", dot: "bg-[var(--unit-c)]", soft: "var(--unit-c-soft)" },
  IV: { text: "text-blue-400", border: "border-blue-500", dot: "bg-blue-500", soft: "rgba(59,130,246,0.15)" },
  V: { text: "text-pink-400", border: "border-pink-500", dot: "bg-pink-500", soft: "rgba(236,72,153,0.15)" },
};

export default function AiDashboard() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--unit-a)" }}>
          <BrainCircuit className="w-3.5 h-3.5" /> Artificial Intelligence
        </p>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          🧠 Visual Knowledge System
        </h1>
        <p className="text-sm text-[var(--text-muted)]">Units I–V • Interactive cheat sheets for rapid revision</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(AI_UNITS).map((u) => {
          const count = ALL_AI_TOPICS.filter((t) => t.unit === u.id).length;
          const acc = UNIT_ACCENT[u.id] || UNIT_ACCENT["I"];
          return (
            <Link key={u.id} href={`/study/ai/cheat#${u.id}`} className="glass-card rounded-2xl p-5 space-y-3 group" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <span className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm ${acc.text} ${acc.dot}`} />
                <span className="text-[10px] font-bold text-[var(--text-muted)]">{count} topics</span>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">{u.title}</h3>
                <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{u.subtitle}</p>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed line-clamp-3">{u.description}</p>
              </div>
              <div className="flex items-center text-[11px] font-semibold gap-1" style={{ color: "var(--unit-a)" }}>
                Open cheat sheets <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/study/ai/cheat" className="glass-card rounded-2xl p-5 space-y-2 group">
          <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">📝 Quick Cheat Sheets <ArrowRight className="w-4 h-4 text-[var(--unit-a)] group-hover:translate-x-0.5 transition-transform" /></h3>
          <p className="text-[11px] text-[var(--text-muted)]">All Units I–V in one tabbed, searchable, interactive page — the fast revision spot.</p>
        </Link>
        <div className="glass-card rounded-2xl p-5 space-y-2">
          <h3 className="font-bold text-sm text-[var(--text-primary)]">🎮 Interactive Visuals Inside</h3>
          <p className="text-[11px] text-[var(--text-muted)]">
            Search-algorithm stepper (BFS/DFS/UCS/Greedy/A*), alpha-beta game tree, CSP map-colouring, truth tables, unification board, and more.
          </p>
        </div>
      </div>
    </div>
  );
}