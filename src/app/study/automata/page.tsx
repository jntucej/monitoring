"use client";

import Link from "next/link";
import { AUTOMATA_UNITS, ALL_AUTOMATA_TOPICS } from "./data";
import { ArrowRight, ChevronRight, Binary, LayoutGrid } from "lucide-react";

const UNIT_ACCENT: Record<string, { text: string; dot: string }> = {
  I: { text: "text-[var(--unit-a)]", dot: "bg-[var(--unit-a)]" },
  II: { text: "text-[var(--unit-b)]", dot: "bg-[var(--unit-b)]" },
  III: { text: "text-[var(--unit-c)]", dot: "bg-[var(--unit-c)]" },
  IV: { text: "text-blue-400", dot: "bg-blue-500" },
  V: { text: "text-pink-400", dot: "bg-pink-500" },
};

export default function AutomataDashboard() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-purple-400">
          <Binary className="w-3.5 h-3.5" /> Automata & Formal Languages
        </p>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          ⚙️ Automata Visual Knowledge System
        </h1>
        <p className="text-sm text-[var(--text-muted)]">Units I–V • DFA/NFA, RE, CFG/PDA, Turing Machines, Undecidability</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(AUTOMATA_UNITS).map((u) => {
          const count = ALL_AUTOMATA_TOPICS.filter((t) => t.unit === u.id).length;
          const acc = UNIT_ACCENT[u.id] || UNIT_ACCENT["I"];
          return (
            <Link key={u.id} href={`/study/automata/cheat#${u.id}`} className="glass-card rounded-2xl p-5 space-y-3 group border border-[var(--border)]">
              <div className="flex items-center justify-between">
                <span className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm ${acc.text} ${acc.dot}`} />
                <span className="text-[10px] font-bold text-[var(--text-muted)]">{count} topics</span>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">{u.title}</h3>
                <p className="text-[11px] font-medium text-[var(--text-muted)]">{u.subtitle}</p>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed line-clamp-3">{u.description}</p>
              </div>
              <div className="flex items-center text-[11px] font-semibold gap-1 text-purple-400">
                Open cheat sheets <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      <Link href="/study/automata/cheat" className="glass-card rounded-2xl p-5 block space-y-2 group">
        <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">📝 Quick Automata Cheat Sheets <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-transform" /></h3>
        <p className="text-[11px] text-[var(--text-muted)]">All Units I–V in one tabbed, searchable, interactive card view for rapid revision.</p>
      </Link>
    </div>
  );
}
