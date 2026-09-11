"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { StudyHeader } from "../../layout";
import { ALL_AUTOMATA_TOPICS, AUTOMATA_UNITS } from "../data";
import { AutomataCheatCard } from "../components/AutomataCheatCard";
import { ArrowLeft, Search, Binary } from "lucide-react";

const UNIT_ACCENT: Record<string, { dot: string; fill: string }> = {
  I: { dot: "bg-[var(--unit-a)]", fill: "var(--unit-a)" },
  II: { dot: "bg-[var(--unit-b)]", fill: "var(--unit-b)" },
  III: { dot: "bg-[var(--unit-c)]", fill: "var(--unit-c)" },
  IV: { dot: "bg-blue-500", fill: "#3b82f6" },
  V: { dot: "bg-pink-500", fill: "#ec4899" },
};

const UNITS = [
  { id: "I", title: "Unit I", subtitle: "DFA, NFA & Minimization" },
  { id: "II", title: "Unit II", subtitle: "RE, Arden & Pumping Lemma" },
  { id: "III", title: "Unit III", subtitle: "CFG, CNF & PDA" },
  { id: "IV", title: "Unit IV", subtitle: "Turing Machine & UTM" },
  { id: "V", title: "Unit V", subtitle: "Halting, Rice & P vs NP" },
];

export default function AutomataCheatPage() {
  const [active, setActive] = useState(0);
  const [q, setQ] = useState("");
  const currentUnitId = UNITS[active].id as keyof typeof AUTOMATA_UNITS;
  const unit = AUTOMATA_UNITS[currentUnitId];
  const unitTopics = ALL_AUTOMATA_TOPICS.filter((t) => t.unit === unit.id);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    return ALL_AUTOMATA_TOPICS.filter((t) =>
      [t.title, t.definition, ...(t.keywords ?? []), ...t.examPoints].join(" ").toLowerCase().includes(q.toLowerCase())
    ).slice(0, 8);
  }, [q]);

  const acc = UNIT_ACCENT[unit.id] || { dot: "bg-purple-500", fill: "#a855f7" };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <StudyHeader title="Automata Cheat Sheets" />

      <Link href="/study/automata" className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Automata Dashboard
      </Link>

      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
          <Binary className="w-3.5 h-3.5" /> Automata & Formal Languages
        </p>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">⚙️ Interactive Automata Cheat Sheets</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Dense cards covering DFA/NFA algorithms, Pumping Lemma proofs, CNF conversion, Turing machines, and Undecidability proofs.
        </p>
      </header>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search DFA, NFA, Arden's, Pumping Lemma, CNF, PDA, Halting Problem..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
        />
        {results.length > 0 && (
          <div className="absolute z-10 mt-2 w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl overflow-hidden divide-y divide-[var(--border)]">
            {results.map((r) => (
              <Link key={r.id} href={`/study/automata/topic/${r.id}`} onClick={() => setQ("")} className="block px-4 py-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--action-primary)]">
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

      <div className="flex items-center gap-2 text-[10px] font-semibold text-purple-400">
        <span className={`w-2 h-2 rounded-full ${acc.dot}`} />
        {unit.title} · {unitTopics.length} topics · {unit.subtitle}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {unitTopics.map((topic) => (
          <Link key={topic.id} href={`/study/automata/topic/${topic.id}`} className="block">
            <AutomataCheatCard topic={topic} />
          </Link>
        ))}
      </div>
    </div>
  );
}
