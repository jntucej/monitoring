"use client";

import React, { useState } from "react";
import { Lightbulb, Target, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

interface PredictOption {
  label: string;
  isCorrect: boolean;
  explanation: string;
}

interface PredictModeProps {
  question: string;
  context?: string;
  options: PredictOption[];
  onAnswered?: (correct: boolean) => void;
  showWhy?: boolean;
}

export function PredictMode({ question, context, options, onAnswered, showWhy = true }: PredictModeProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    onAnswered?.(options[idx].isCorrect);
  };

  const handleReset = () => {
    setSelected(null);
    setAnswered(false);
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
          🧠 Predict Mode
        </span>
      </div>

      {context && (
        <p className="text-[10px] text-[var(--text-muted)] italic">{context}</p>
      )}

      <p className="text-[11px] font-semibold text-[var(--text-primary)]">{question}</p>

      <div className="space-y-1.5">
        {options.map((opt, idx) => {
          let btnClass = "bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]";
          let borderClass = "border";

          if (answered) {
            if (opt.isCorrect) {
              btnClass = "bg-emerald-500/20 border-emerald-500/40 text-emerald-300";
              borderClass = "border-emerald-500/40";
            } else if (selected === idx) {
              btnClass = "bg-red-500/20 border-red-500/40 text-red-300";
              borderClass = "border-red-500/40";
            } else {
              btnClass = "bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-muted)] opacity-50";
              borderClass = "border opacity-50";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={answered}
              className={`w-full text-left px-3 py-2 rounded-lg text-[10.5px] font-medium transition-all ${btnClass} ${borderClass}`}
            >
              <span className="font-bold mr-2 text-[9px]">{String.fromCharCode(65 + idx)}.</span>
              {opt.label}
            </button>
          );
        })}
      </div>

      {answered && selected !== null && (
        <div className="space-y-2">
          {options[selected].isCorrect ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10.5px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              ✓ Correct
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[10.5px] font-bold">
              <XCircle className="w-3.5 h-3.5" />
              ✗ Incorrect
            </div>
          )}

          {showWhy && (
            <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)]">
              <div className="font-bold text-[var(--unit-accent)] mb-1 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                WHY?
              </div>
              <p>{options.find(o => o.isCorrect)?.explanation ?? options[selected].explanation}</p>
            </div>
          )}

          <button
            onClick={handleReset}
            className="px-3 py-1 rounded text-[9px] font-bold bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Try Again ↺
          </button>
        </div>
      )}
    </div>
  );
}