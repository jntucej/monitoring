"use client";

import Link from "next/link";
import { PDC_UNITS, ALL_PDC_TOPICS } from "./data";
import { ArrowRight, ChevronRight, Zap } from "lucide-react";

const UNIT_ACCENT: Record<string, { text: string; border: string; dot: string; soft: string }> = {
  I: { text: "text-[var(--unit-a)]", border: "border-[var(--unit-a)]", dot: "bg-[var(--unit-a)]", soft: "var(--unit-a-soft)" },
  II: { text: "text-[var(--unit-b)]", border: "border-[var(--unit-b)]", dot: "bg-[var(--unit-b)]", soft: "var(--unit-b-soft)" },
  III: { text: "text-[var(--unit-c)]", border: "border-[var(--unit-c)]", dot: "bg-[var(--unit-c)]", soft: "var(--unit-c-soft)" },
};

export default function PdcDashboard() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--unit-a)" }}>
          <Zap className="w-3.5 h-3.5" /> Parallel & Distributed Computing
        </p>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          ⚡ Visual Knowledge System
        </h1>
        <p className="text-sm text-[var(--text-muted)]">Units I–III • Interactive cheat sheets for rapid revision</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {Object.values(PDC_UNITS).map((u) => {
          const count = ALL_PDC_TOPICS.filter((t) => t.unit === u.id).length;
          const acc = UNIT_ACCENT[u.id];
          return (
            <Link key={u.id} href={`/study/pdc/cheat#${u.id}`} className="glass-card rounded-2xl p-5 space-y-3 group" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <span className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm ${acc.text} ${acc.dot}`} />
                <span className="text-[10px] font-bold text-[var(--text-muted)]">{count} topics</span>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">{u.title}</h3>
                <p className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{u.subtitle}</p>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{u.description}</p>
              </div>
              <div className="flex items-center text-[11px] font-semibold gap-1" style={{ color: "var(--unit-a)" }}>
                Open cheat sheets <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/study/pdc/cheat" className="glass-card rounded-2xl p-5 space-y-2 group">
          <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">📝 Quick Cheat Sheets <ArrowRight className="w-4 h-4 text-[var(--unit-a)] group-hover:translate-x-0.5 transition-transform" /></h3>
          <p className="text-[11px] text-[var(--text-muted)]">All Units I–III in one tabbed, searchable, interactive page — the fast revision spot.</p>
        </Link>
        <div className="glass-card rounded-2xl p-5 space-y-2">
          <h3 className="font-bold text-sm text-[var(--text-primary)]">🎮 Interactive Visuals Inside</h3>
          <p className="text-[11px] text-[var(--text-muted)]">
            Amdahl's-law slider, Flynn's taxonomy tap-grid, linear-pipeline space-time diagram, non-linear reservation table, consistency-model chooser, and more.
          </p>
        </div>
      </div>
    </div>
  );
}