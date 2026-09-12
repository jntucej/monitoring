"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";

export function DfaMinimizationPlayground() {
  const [step, setStep] = useState(0);

  const steps = [
    { title: "Step 1: Unreachable States", desc: "Check for unreachable states from q0 and remove them.", detail: "All states {q0, q1, q2, q3, q4} are reachable from start state q0." },
    { title: "Step 2: Base Distinguishability", desc: "Mark state pairs where one is Final (F) and the other is Non-Final.", detail: "Mark pairs (q2, q0), (q2, q1), (q2, q3) because q2 is Final and others are Non-Final." },
    { title: "Step 3: Propagate Markings", desc: "For unmarked pair (p,q), if (δ(p,a), δ(q,a)) is marked, mark (p,q).", detail: "Mark (q0, q3) because δ(q0,0)=q1 and δ(q3,0)=q2, and (q1,q2) is marked!" },
    { title: "Step 4: Merge Equivalent States", desc: "Unmarked remaining pairs are indistinguishable and get merged.", detail: "Unmarked pair (q0, q1) merged into state {q0, q1}! Minimal DFA state count reduced from 5 to 4." },
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
          🔍 DFA Minimization Step Solver (Table-Filling)
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="p-1 rounded bg-[var(--bg-surface)] border border-[var(--border)] disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <span className="text-[10px] font-mono px-1.5">{step + 1}/{steps.length}</span>
          <button onClick={() => setStep(Math.min(steps.length - 1, step + 1))} disabled={step === steps.length - 1} className="p-1 rounded bg-[var(--bg-surface)] border border-[var(--border)] disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
          <button onClick={() => setStep(0)} className="p-1 rounded bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)]"><RotateCcw className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-purple-500/30 space-y-1 text-xs">
        <h4 className="font-bold text-purple-400">{steps[step].title}</h4>
        <p className="text-[11px] text-[var(--text-secondary)]">{steps[step].desc}</p>
        <div className="p-2 rounded bg-purple-500/10 text-purple-300 font-mono text-[10.5px]">
          {steps[step].detail}
        </div>
      </div>
    </div>
  );
}
