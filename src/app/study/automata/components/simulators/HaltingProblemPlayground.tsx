"use client";

import React, { useState } from "react";
import { AlertOctagon, ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";

export function HaltingProblemPlayground() {
  const [step, setStep] = useState(0);

  const steps = [
    { title: "Step 1: Assume Halting Decider H Exists", desc: "Assume a program H(P, I) can decide if ANY program P halts on input I.", result: "H(P, I) → YES (Halts) or NO (Loops)" },
    { title: "Step 2: Construct Adversary Program D", desc: "Build machine D(P) that calls H(P, P) and does the OPPOSITE.", result: "If H(P, P) = YES → D loops forever! If H(P, P) = NO → D halts!" },
    { title: "Step 3: Pass D into Itself: D(D)", desc: "What happens when we run D with its own source code D(D)?", result: "D(D) halts ⟺ H(D, D) = NO ⟺ D(D) loops forever!" },
    { title: "Step 4: Logical Paradox!", desc: "D(D) halts IF AND ONLY IF D(D) loops forever!", result: "IMPOSSIBLE CONTRADICTION! Therefore, Halting Decider H CANNOT EXIST!" },
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
          💥 Halting Problem & Diagonalization Paradox Walk-Through
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="p-1 rounded bg-[var(--bg-surface)] border border-[var(--border)] disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <span className="text-[10px] font-mono px-1.5">{step + 1}/{steps.length}</span>
          <button onClick={() => setStep(Math.min(steps.length - 1, step + 1))} disabled={step === steps.length - 1} className="p-1 rounded bg-[var(--bg-surface)] border border-[var(--border)] disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
          <button onClick={() => setStep(0)} className="p-1 rounded bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)]"><RotateCcw className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-purple-500/30 space-y-1.5 text-xs">
        <h4 className="font-bold text-purple-400">{steps[step].title}</h4>
        <p className="text-[11px] text-[var(--text-secondary)]">{steps[step].desc}</p>
        <div className={`p-2 rounded font-mono text-[10.5px] font-bold ${step === 3 ? "bg-red-500/10 text-red-400 border border-red-500/30" : "bg-purple-500/10 text-purple-300"}`}>
          {steps[step].result}
        </div>
      </div>

      {step === 3 && (
        <div className="p-2.5 rounded-lg border bg-red-500/10 border-red-500/30 text-red-400 flex items-center gap-2 text-xs font-bold animate-pulse">
          <AlertOctagon className="w-4 h-4" />
          <span>PROVED: The Halting Problem is UNDECIDABLE!</span>
        </div>
      )}
    </div>
  );
}
