"use client";

import Link from "next/link";
import { useState } from "react";
import { StudyHeader } from "../../layout";
import { cheat0 } from "../../_ml/cheat0";
import { cheat3 } from "../../_ml/cheat3";
import { cheat4 } from "../../_ml/cheat4";
import type { CS } from "../../_ml/CheatData";
import { Lightbulb, Target } from "lucide-react";

const UNITS = [
  { id: "I", title: "Unit I", subtitle: "Intro, Model Prep, Feature Eng", cards: cheat0 },
  { id: "II", title: "Unit II", subtitle: "Supervised Learning", cards: cheat4 },
  { id: "III", title: "Unit III", subtitle: "Unsupervised Learning", cards: cheat3 },
];

function Card({ c }: { c: CS }) {
  return (
    <div className="glass-card rounded-xl p-4 space-y-2.5">
      <h3 className="text-sm font-bold text-[var(--text-primary)]">{c.title}</h3>
      {c.def && <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{c.def}</p>}

      {c.formula && (
        <div className="rounded-lg bg-[var(--action-primary)]/5 border border-[var(--action-primary)]/20 px-3 py-2">
          <p className="font-mono text-xs text-[var(--action-primary)]">{c.formula}</p>
          {c.symbols && (
            <p className="text-[9px] text-[var(--text-muted)] mt-1">
              {c.symbols.map(([k, v]) => `${k}: ${v}`).join("  •  ")}
            </p>
          )}
        </div>
      )}

      {c.steps && (
        <ol className="space-y-0.5">
          {c.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[10.5px] text-[var(--text-secondary)]">
              <span className="w-3.5 h-3.5 rounded-full bg-[var(--action-primary)]/15 text-[8px] font-bold text-[var(--action-primary)] flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      )}

      {c.examPoints && (
        <div className="space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--action-warning)] flex items-center gap-1"><Target className="w-2.5 h-2.5" /> Exam</p>
          {c.examPoints.map((p, i) => (
            <p key={i} className="text-[10.5px] text-[var(--text-secondary)] pl-3 border-l border-[var(--action-warning)]/40">{p}</p>
          ))}
        </div>
      )}

      {c.remember && (
        <div className="flex items-start gap-1.5 rounded-lg bg-[var(--action-primary)]/5 border border-[var(--action-primary)]/20 px-2.5 py-1.5">
          <Lightbulb className="w-3 h-3 text-[var(--action-primary)] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] font-medium text-[var(--action-primary)]">{c.remember}</p>
        </div>
      )}
    </div>
  );
}

export default function CheatSheetPage() {
  const [active, setActive] = useState(0);
  const unit = UNITS[active];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <StudyHeader title="Cheat Sheets" />

      <header className="space-y-0.5">
        <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          📝 ML Cheat Sheets
        </h1>
        <p className="text-xs text-[var(--text-muted)]">
          One dense card per concept — formula, exam points, memory trigger. Scan in under 30s.
        </p>
      </header>

      <div className="flex gap-2">
        {UNITS.map((u, i) => (
          <button
            key={u.id}
            onClick={() => setActive(i)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-center transition-all ${
              i === active
                ? "bg-[var(--action-primary)] text-white shadow-md"
                : "bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--action-primary)]/40"
            }`}
          >
            <div className="text-xs font-bold">{u.title}</div>
            <div className="text-[9px] opacity-80">{u.subtitle}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {unit.cards.map((c, idx) => (
          <Card key={`${c.title}-${idx}`} c={c} />
        ))}
      </div>

      {unit.cards.length === 0 && (
        <div className="text-center py-10 text-sm text-[var(--text-muted)]">
          Coming soon — content being added.
        </div>
      )}
    </div>
  );
}
