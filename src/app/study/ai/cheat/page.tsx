"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { StudyHeader } from "../../layout";
import { ALL_AI_TOPICS, AI_UNITS } from "../data";
import { AiCheatCard } from "../components/AiCheatCard";
import { ArrowLeft, Search, BrainCircuit } from "lucide-react";

const UNIT_ACCENT: Record<string, { chip: string; dot: string; fill: string; soft: string }> = {
  I: { chip: "text-[var(--unit-a)]", dot: "bg-[var(--unit-a)]", fill: "var(--unit-a)", soft: "var(--unit-a-soft)" },
  II: { chip: "text-[var(--unit-b)]", dot: "bg-[var(--unit-b)]", fill: "var(--unit-b)", soft: "var(--unit-b-soft)" },
  III: { chip: "text-[var(--unit-c)]", dot: "bg-[var(--unit-c)]", fill: "var(--unit-c)", soft: "var(--unit-c-soft)" },
};

const UNITS = [
  { id: "I", title: "Unit I", subtitle: "Agents · Search · Local Search" },
  { id: "II", title: "Unit II", subtitle: "Games · CSP · Logic" },
  { id: "III", title: "Unit III", subtitle: "FOL · Unification · Inference" },
];

export default function AiCheatPage() {
  const [active, setActive] = useState(0);
  const [q, setQ] = useState("");
  const unit = AI_UNITS[UNITS[active].id as "I" | "II" | "III"];
  const unitTopics = ALL_AI_TOPICS.filter((t) => t.unit === unit.id);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    return ALL_AI_TOPICS.filter((t) =>
      [t.title, t.definition, ...(t.keywords ?? []), ...t.examPoints].join(" ").toLowerCase().includes(q.toLowerCase())
    ).slice(0, 6);
  }, [q]);

  const acc = UNIT_ACCENT[unit.id];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <StudyHeader title="AI Cheat Sheets" />

      <Link href="/study/ai" className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> AI Knowledge System
      </Link>

      <header className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--unit-a)" }}>
          <BrainCircuit className="w-3.5 h-3.5" /> Artificial Intelligence
        </p>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">🧠 Interactive Cheat Sheets</h1>
        <p className="text-xs text-[var(--text-muted)]">
          Dense, visual quick-revision cards. Tap the interactive diagrams to explore every concept.
        </p>
      </header>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search A*, minimax, CSP, FOL, unification..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
        />
        {results.length > 0 && (
          <div className="absolute z-10 mt-2 w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl overflow-hidden">
            {results.map((r) => (
              <button key={r.id} onClick={() => { setActive(UNITS.findIndex((u) => u.id === r.unit)); setQ(""); }} className="block w-full text-left px-4 py-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--action-primary)]">
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${UNIT_ACCENT[r.unit].dot}`} />{r.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {UNITS.map((u, i) => (
          <button
            key={u.id}
            onClick={() => setActive(i)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-center transition-all border ${
              i === active
                ? "text-white shadow-md"
                : "bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--action-primary)]/40"
            }`}
            style={i === active ? { background: UNIT_ACCENT[u.id].fill, borderColor: UNIT_ACCENT[u.id].fill } : undefined}
          >
            <div className="text-xs font-bold">{u.title}</div>
            <div className="text-[9px] opacity-80">{u.subtitle}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[10px] font-semibold" style={{ color: "var(--unit-a)" }}>
        <span className={`w-2 h-2 rounded-full ${acc.dot}`} />
        {unit.title} · {unitTopics.length} topics · {unit.subtitle}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {unitTopics.map((t) => (
          <Link key={t.id} href={`/study/ai/topic/${t.id}`} className="block">
            <AiCheatCard topic={t} />
          </Link>
        ))}
      </div>
    </div>
  );
}