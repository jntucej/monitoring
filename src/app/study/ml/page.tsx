"use client";

import Link from "next/link";
import { UNITS, TOPIC_LIST, topicsForUnit } from "../_ml";
import { Brain, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

const UNIT_ACCENT: Record<string, { dot: string; ring: string }> = {
  I: { dot: "bg-sky-400", ring: "border-sky-500/30" },
  II: { dot: "bg-emerald-400", ring: "border-emerald-500/30" },
  III: { dot: "bg-fuchsia-400", ring: "border-fuchsia-500/30" },
};

export default function MlDashboard() {
  const [q, setQ] = useState("");
  const results = q.trim() ? TOPIC_LIST.filter((t) =>
    [t.title, t.definition, ...(t.keyPoints ?? [])].join(" ").toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8) : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--action-primary)]">Machine Learning • IT503PC</p>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Brain className="w-6 h-6 text-[var(--action-primary)]" /> Visual Knowledge System
        </h1>
        <p className="text-sm text-[var(--text-muted)]">Units I–III • Mid Examination • Mobile-first visual revision</p>
      </header>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search topics, algorithms, formulas..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
        />
        {results.length > 0 && (
          <div className="absolute z-10 mt-2 w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl overflow-hidden">
            {results.map((r) => (
              <Link key={r.id} href={`/study/ml/topic/${r.id}`} className="block px-4 py-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--action-primary)]">
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${UNIT_ACCENT[r.unit]?.dot}" />{r.title}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Object.values(UNITS).map((u) => {
          const topics = topicsForUnit(u.id);
          return (
            <Link key={u.id} href={`/study/ml/unit/${u.id}`} className="glass-card rounded-2xl p-5 space-y-3 group">
              <div className="flex items-center justify-between">
                <span className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm ${UNIT_ACCENT[u.id]?.ring} ${UNIT_ACCENT[u.id]?.dot}`} />
                <span className="text-[10px] font-bold text-[var(--text-muted)]">{topics.length} topics</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Unit {u.id} — {u.title}</h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">{u.description}</p>
              </div>
              <div className="flex items-center text-[11px] font-semibold text-[var(--action-primary)]">
                Open <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}