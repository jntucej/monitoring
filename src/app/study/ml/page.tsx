"use client";

import Link from "next/link";
import { UNITS_CONFIG, ALL_CHEAT_TOPICS } from "./data";
import { Brain, ChevronRight, Search, ArrowRight } from "lucide-react";
import { useState } from "react";

const UNIT_ACCENT: Record<string, { bg: string; text: string }> = {
  I: { bg: "bg-[var(--unit-a)]", text: "text-[var(--unit-a)]" },
  II: { bg: "bg-[var(--unit-b)]", text: "text-[var(--unit-b)]" },
  III: { bg: "bg-[var(--unit-c)]", text: "text-[var(--unit-c)]" },
  IV: { bg: "bg-blue-500", text: "text-blue-400" },
  V: { bg: "bg-pink-500", text: "text-pink-400" },
};

export default function MlDashboard() {
  const [q, setQ] = useState("");
  const results = q.trim()
    ? ALL_CHEAT_TOPICS.filter((t) =>
        [t.title, t.definition, t.oneLineIdea, ...(t.keywords ?? [])].join(" ").toLowerCase().includes(q.toLowerCase())
      ).slice(0, 8)
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 text-[var(--text-primary)]">
      <header className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--action-primary)]">Machine Learning • IT503PC</p>
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
          <Brain className="w-6 h-6 text-[var(--action-primary)]" /> Visual Knowledge System
        </h1>
        <p className="text-sm text-[var(--text-muted)]">Units I–V • Exam cheat sheets, worked numericals & active recall self-tests.</p>
      </header>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Linear Regression, Naïve Bayes, PCA, Perceptron, Backprop, Case Studies..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
        />
        {results.length > 0 && (
          <div className="absolute z-20 mt-2 w-full rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl overflow-hidden divide-y divide-[var(--border)]">
            {results.map((r) => (
              <Link key={r.id} href={`/study/ml/topic/${r.id}`} className="block px-4 py-3 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--action-primary)]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--text-primary)]">{r.title}</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)]">
                    Unit {r.unitNumber || r.unit} • {r.tier || "CORE"}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5">{r.oneLineIdea || r.definition}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(UNITS_CONFIG).map((u) => {
          const topicCount = ALL_CHEAT_TOPICS.filter((t) => (t.unitNumber || t.unit) === u.unitNumber).length;
          const coreCount = ALL_CHEAT_TOPICS.filter((t) => (t.unitNumber || t.unit) === u.unitNumber && (t.tier || "CORE") === "CORE").length;
          const acc = UNIT_ACCENT[u.unitNumber] || { bg: "bg-emerald-500", text: "text-emerald-400" };

          return (
            <Link key={u.id} href={`/study/ml/cheat`} className="glass-card rounded-2xl p-5 space-y-3 group border border-[var(--border)] hover:border-[var(--action-primary)]/50 transition-all shadow-md">
              <div className="flex items-center justify-between">
                <span className={`w-8 h-8 rounded-xl ${acc.bg} text-white font-extrabold text-xs flex items-center justify-center shadow-md`}>
                  {u.unitNumber}
                </span>
                <div className="flex gap-1 text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    🎯 {coreCount} Core
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)]">
                    {topicCount} total
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
        <Link href="/study/ml/cheat" className="glass-card rounded-2xl p-5 space-y-2 group border border-[var(--border)] hover:border-[var(--action-primary)]/50 transition-all">
          <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
            📝 Fast Revision & Recall Mode <ArrowRight className="w-4 h-4 text-[var(--action-primary)] group-hover:translate-x-0.5 transition-transform" />
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            All Units I–V in one searchable, tabbed 3-column dashboard with ⚡ Revision Mode and 🧠 Active Recall Self-Tests.
          </p>
        </Link>

        <div className="glass-card rounded-2xl p-5 space-y-2 border border-[var(--border)]">
          <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
            🧮 Worked Numerical Engine
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Step-by-step 10-mark worked exam solutions for Perceptron Weight Updates, Backpropagation Error Deltas, Naïve Bayes, and PCA.
          </p>
        </div>
      </div>
    </div>
  );
}
