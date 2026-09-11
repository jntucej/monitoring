"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { StudyHeader } from "../../layout";
import { ALL_CHEAT_TOPICS, UNITS_CONFIG } from "../data";
import { MlCheatCard } from "../components/MlCheatCard";
import { ArrowLeft, Search, Brain } from "lucide-react";

const UNIT_ACCENT: Record<string, { dot: string; fill: string }> = {
  I: { dot: "bg-[var(--unit-a)]", fill: "var(--unit-a)" },
  II: { dot: "bg-[var(--unit-b)]", fill: "var(--unit-b)" },
  III: { dot: "bg-[var(--unit-c)]", fill: "var(--unit-c)" },
  IV: { dot: "bg-blue-500", fill: "#3b82f6" },
  V: { dot: "bg-pink-500", fill: "#ec4899" },
};

const UNITS = [
  { id: "I", title: "Unit I", subtitle: "Intro, Preprocessing, PCA" },
  { id: "II", title: "Unit II", subtitle: "Regression & Classification" },
  { id: "III", title: "Unit III", subtitle: "Clustering & Density" },
  { id: "IV", title: "Unit IV", subtitle: "Neurons & Backprop" },
  { id: "V", title: "Unit V", subtitle: "Deep ML & Case Studies" },
];

export default function MlCheatPage() {
  const [active, setActive] = useState(0);
  const [q, setQ] = useState("");
  const currentUnitId = UNITS[active].id as keyof typeof UNITS_CONFIG;
  const unit = UNITS_CONFIG[currentUnitId];
  const unitTopics = ALL_CHEAT_TOPICS.filter((t) => t.unit === unit.id);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    return ALL_CHEAT_TOPICS.filter((t) =>
      [t.title, t.definition, ...(t.keywords ?? []), ...t.examPoints].join(" ").toLowerCase().includes(q.toLowerCase())
    ).slice(0, 8);
  }, [q]);

  const acc = UNIT_ACCENT[unit.id] || { dot: "bg-emerald-500", fill: "#10b981" };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <StudyHeader title="ML Cheat Sheets" />

      <Link href="/study/ml" className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> ML Knowledge System
      </Link>

      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--action-primary)] flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5" /> Machine Learning • IT503PC
        </p>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">📝 Interactive Cheat Sheets</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Dense visual cards with formulas, step-by-step algorithms, worked numericals & exam points. Scan in under 30s.
        </p>
      </header>

      {/* Global Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Linear Regression, Naïve Bayes, PCA, Perceptron, Backprop, Case Studies..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
        />
        {results.length > 0 && (
          <div className="absolute z-10 mt-2 w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl overflow-hidden divide-y divide-[var(--border)]">
            {results.map((r) => (
              <Link key={r.id} href={`/study/ml/topic/${r.id}`} onClick={() => setQ("")} className="block px-4 py-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--action-primary)]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--text-primary)]">{r.title}</span>
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)]">
                    Unit {r.unit}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5">{r.definition}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Unit Tab Switcher */}
      <div className="flex gap-2">
        {UNITS.map((u, i) => (
          <button
            key={u.id}
            onClick={() => setActive(i)}
            className={`flex-1 rounded-xl px-2.5 py-2.5 text-center transition-all border ${
              i === active
                ? "text-white shadow-md font-bold"
                : "bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--action-primary)]/40"
            }`}
            style={i === active ? { background: (UNIT_ACCENT[u.id] || acc).fill, borderColor: (UNIT_ACCENT[u.id] || acc).fill } : undefined}
          >
            <div className="text-xs font-bold">{u.title}</div>
            <div className="text-[9px] opacity-80 line-clamp-1">{u.subtitle}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--action-primary)]">
        <span className={`w-2 h-2 rounded-full ${acc.dot}`} />
        {unit.title} · {unitTopics.length} topics · {unit.subtitle}
      </div>

      {/* Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {unitTopics.map((topic) => (
          <Link key={topic.id} href={`/study/ml/topic/${topic.id}`} className="block">
            <MlCheatCard topic={topic} />
          </Link>
        ))}
      </div>
    </div>
  );
}

