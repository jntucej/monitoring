"use client";

import React, { useState } from "react";
import type { CheatTopic } from "../types";
import { AiVisual } from "../ai/components/AiVisual";
import { Lightbulb, Target, AlertTriangle, Eye, CheckCircle2, Sparkles } from "lucide-react";

export type DisplayMode = "full" | "revision" | "recall";

interface StudyCardProps {
  topic: CheatTopic;
  mode?: DisplayMode;
  accentColor?: string;
  onToggleRevised?: (id: string) => void;
  isRevised?: boolean;
}

export function StudyCard({
  topic,
  mode = "full",
  accentColor = "var(--unit-a)",
  onToggleRevised,
  isRevised = false,
}: StudyCardProps) {
  const [revealedRecall, setRevealedRecall] = useState<Record<number, boolean>>({});
  const diffRows = topic.differences ?? [];
  const hasDiff = diffRows.length > 0;
  const has3col = diffRows.some((r) => r.valC !== undefined);

  const toggleRecall = (index: number) => {
    setRevealedRecall((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const isCore = topic.tier === "CORE";
  const tierBadgeClass = isCore
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    : topic.tier === "EXTENDED"
    ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
    : "bg-amber-500/15 text-amber-400 border-amber-500/30";

  const kindBadge = {
    algorithm: "📐 ALGORITHM",
    concept: "🧠 CONCEPT",
    formula: "📌 FORMULA",
    numerical: "🧮 NUMERICAL",
    comparison: "📊 COMPARISON",
    proof: "📜 PROOF",
    interactive: "🎮 INTERACTIVE",
    workflow: "🔄 WORKFLOW",
    "case-study": "💼 CASE STUDY",
  }[topic.kind || "concept"];

  return (
    <div
      className="glass-card rounded-2xl p-5 space-y-4 border transition-all shadow-lg text-[var(--text-primary)]"
      style={{ borderColor: "var(--border)", ["--unit-accent" as any]: accentColor }}
    >
      {/* Card Header & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${tierBadgeClass}`}>
              {isCore ? "🎯 CORE SYLLABUS" : topic.tier === "EXTENDED" ? "📚 EXTENDED" : "📚 SUPPORTING"}
            </span>
            <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)]">
              {kindBadge}
            </span>
            {topic.importance === "HIGH" && (
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                ⭐ HIGH IMPORTANCE
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{topic.title}</h2>
        </div>

        {onToggleRevised && (
          <button
            onClick={() => onToggleRevised(topic.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isRevised
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" /> {isRevised ? "Revised" : "Mark Revised"}
          </button>
        )}
      </div>

      {/* RECALL MODE */}
      {mode === "recall" && (
        <div className="space-y-3 bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--unit-accent)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> 🧠 Active Retrieval Self-Test
            </p>
            <button
              onClick={() => {
                const all: Record<number, boolean> = {};
                (topic.recallQuestions ?? []).forEach((_, i) => (all[i] = true));
                setRevealedRecall(all);
              }}
              className="text-[11px] font-semibold text-[var(--action-primary)] hover:underline"
            >
              Reveal All Answers
            </button>
          </div>

          {(topic.recallQuestions ?? [
            { prompt: `What is the core formula or key idea behind ${topic.title}?`, answer: topic.oneLineIdea || topic.definition },
            { prompt: "What are the main exam points to remember?", answer: topic.examPoints.join("; ") },
          ]).map((q, idx) => {
            const isRevealed = !!revealedRecall[idx];
            return (
              <div key={idx} className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] space-y-2">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{idx + 1}. {q.prompt}</p>
                {q.hint && !isRevealed && <p className="text-xs italic text-[var(--text-muted)]">Hint: {q.hint}</p>}
                
                {isRevealed ? (
                  <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-300">
                    ✓ {q.answer}
                  </div>
                ) : (
                  <button
                    onClick={() => toggleRecall(idx)}
                    className="flex items-center gap-1 text-xs font-bold text-[var(--unit-accent)] hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" /> Reveal Answer
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ONE-LINE IDEA BANNER */}
      {topic.oneLineIdea && mode !== "recall" && (
        <div className="p-3 rounded-xl border bg-[var(--bg-elevated)]" style={{ borderColor: accentColor }}>
          <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: accentColor }}>
            💡 {topic.oneLineIdea}
          </p>
        </div>
      )}

      {/* DEFINITION & FORMULA */}
      {mode !== "recall" && (
        <>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{topic.definition}</p>

          {/* Formula */}
          {topic.formula && (
            <div className="rounded-xl border px-4 py-3 space-y-1.5 bg-[var(--bg-surface)]" style={{ borderColor: accentColor }}>
              <p className="font-mono text-sm font-bold" style={{ color: accentColor }}>
                {topic.formula.expression}
              </p>
              {topic.formula.symbols && (
                <div className="flex flex-wrap gap-x-4 text-xs text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                  {Object.entries(topic.formula.symbols).map(([k, v]) => (
                    <span key={k}><strong className="text-[var(--text-primary)]">{k}:</strong> {v}</span>
                  ))}
                </div>
              )}
            </div>
          )}



          {/* Complexity */}
          {topic.complexity && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {topic.complexity.time && (
                <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-center">
                  <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">Time</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">{topic.complexity.time}</span>
                </div>
              )}
              {topic.complexity.space && (
                <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-center">
                  <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">Space</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">{topic.complexity.space}</span>
                </div>
              )}
              {topic.complexity.completeness && (
                <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-center">
                  <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">Complete?</span>
                  <span className="font-bold text-[var(--text-primary)]">{topic.complexity.completeness}</span>
                </div>
              )}
              {topic.complexity.optimality && (
                <div className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-center">
                  <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">Optimal?</span>
                  <span className="font-bold text-[var(--text-primary)]">{topic.complexity.optimality}</span>
                </div>
              )}
            </div>
          )}

          {/* Steps */}
          {topic.steps && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">⚙️ Steps / Procedure</p>
              <ol className="space-y-1">
                {topic.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="w-4 h-4 rounded-full bg-[var(--unit-accent)] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Worked Numerical Example */}
          {topic.workedNumerical && (
            <div className="space-y-2.5 p-4 rounded-xl border bg-[var(--bg-elevated)] border-emerald-500/30">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  🧮 WORKED EXAM NUMERICAL: {topic.workedNumerical.title}
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  10-MARK READY
                </span>
              </div>

              {/* Given Data */}
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">📌 Given Data</p>
                <div className="flex flex-wrap gap-x-4 text-xs font-mono text-[var(--text-primary)]">
                  {topic.workedNumerical.given.map((g, idx) => (
                    <span key={idx}>• {g}</span>
                  ))}
                </div>
              </div>

              {/* Core Formula */}
              {topic.workedNumerical.formula && (
                <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] font-mono text-xs font-bold text-emerald-400">
                  📐 Formula: {topic.workedNumerical.formula}
                </div>
              )}

              {/* Step-by-Step Numerical Calculations */}
              <div className="space-y-2 pt-1">
                {topic.workedNumerical.steps.map((st) => (
                  <div key={st.stepNumber} className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1 text-xs">
                    <p className="font-bold text-[var(--text-primary)]">
                      Step {st.stepNumber}: {st.title}
                    </p>
                    {st.formula && <p className="font-mono text-[11px] text-[var(--text-muted)]">Formula: {st.formula}</p>}
                    <p className="font-mono text-xs text-[var(--text-secondary)]">Calculation: {st.calculation}</p>
                    <p className="font-mono font-bold text-emerald-400">Result: {st.result}</p>
                  </div>
                ))}
              </div>

              {/* Final Answer */}
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs font-bold text-emerald-300">
                ✅ Final Answer: {topic.workedNumerical.answer}
              </div>
            </div>
          )}



          {/* Differences */}
          {hasDiff && mode === "full" && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">📊 Differences</p>
              <div className="rounded-xl border border-[var(--border)] overflow-hidden text-xs">
                <div className="grid bg-[var(--bg-elevated)] font-bold text-[var(--text-muted)] border-b border-[var(--border)]" style={{ gridTemplateColumns: has3col ? "1fr 1fr 1fr" : "1fr 1fr" }}>
                  <div className="p-2.5">Feature</div>
                  <div className="p-2.5 border-l border-[var(--border)] text-center">Option A</div>
                  <div className="p-2.5 border-l border-[var(--border)] text-center">Option B</div>
                </div>
                {diffRows.map((d, i) => (
                  <div key={i} className="grid border-b border-[var(--border)] last:border-0" style={{ gridTemplateColumns: has3col ? "1fr 1fr 1fr" : "1fr 1fr" }}>
                    <div className="p-2.5 font-medium text-[var(--text-primary)]">{d.feature}</div>
                    <div className="p-2.5 text-[var(--text-secondary)] border-l border-[var(--border)] text-center">{d.valA}</div>
                    <div className="p-2.5 text-[var(--text-secondary)] border-l border-[var(--border)] text-center">{d.valB}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exam Points */}
          {topic.examPoints && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--action-warning)] flex items-center gap-1">
                <Target className="w-3.5 h-3.5" /> Exam Highlights
              </p>
              <ul className="space-y-1">
                {topic.examPoints.map((p, i) => (
                  <li key={i} className="text-xs text-[var(--text-secondary)] pl-3 border-l-2 border-[var(--action-warning)]">
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Mistakes */}
          {topic.commonMistakes && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-rose-400">
                <AlertTriangle className="w-4 h-4" /> ⚠️ Common Exam Trap
              </p>
              {topic.commonMistakes.map((m, i) => (
                <p key={i}>• {m}</p>
              ))}
            </div>
          )}

          {/* Visual Widget */}
          {topic.visual && mode === "full" && (
            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">🎮 Interactive Visual Stepper</p>
              <AiVisual visual={topic.visual} />
            </div>
          )}

          {/* Memory Trigger */}
          {topic.memoryTrigger && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2 border bg-[var(--bg-elevated)]" style={{ borderColor: accentColor }}>
              <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
              <p className="text-xs font-semibold" style={{ color: accentColor }}>
                Mnemonic: {topic.memoryTrigger}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

