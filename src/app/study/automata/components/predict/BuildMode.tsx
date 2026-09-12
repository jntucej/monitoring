"use client";

import React, { useState } from "react";
import { Hammer, CheckCircle2, XCircle, HelpCircle, Lightbulb } from "lucide-react";
import type { BuildModeSpec } from "../../data/types";

interface BuildModeProps {
  buildSpec: BuildModeSpec;
  onCheck?: (correct: boolean) => void;
}

export function BuildMode({ buildSpec, onCheck }: BuildModeProps) {
  const [phase, setPhase] = useState<"prompt" | "build" | "check" | "result">("prompt");
  const [answer, setAnswer] = useState("");
  const [hintIdx, setHintIdx] = useState(0);
  const [result, setResult] = useState<boolean | null>(null);

  const handleCheck = () => {
    const normalized = answer.trim().toLowerCase();
    const isCorrect = buildSpec.validation.some((v) => normalized.includes(v.toLowerCase()));
    setResult(isCorrect);
    setPhase("result");
    onCheck?.(isCorrect);
  };

  const handleReset = () => {
    setAnswer("");
    setResult(null);
    setHintIdx(0);
    setPhase("prompt");
  };

  if (phase === "result") {
    return (
      <div className={`rounded-xl border p-3.5 space-y-2 ${result ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
        <div className="flex items-center gap-2">
          {result ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
          <span className={`text-[11px] font-bold ${result ? "text-emerald-400" : "text-red-400"}`}>
            {result ? "✓ Well done! Your machine is correct." : "✗ Not quite. Try again or use hints."}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPhase("build")} className="px-3 py-1.5 rounded text-[9px] font-bold bg-[var(--bg-surface)] border border-[var(--border)]">Retry</button>
          <button onClick={handleReset} className="px-3 py-1.5 rounded text-[9px] font-bold bg-[var(--bg-surface)] border border-[var(--border)]">Reset</button>
        </div>
      </div>
    );
  }

  if (phase === "prompt") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-3">
        <div className="flex items-center gap-2">
          <Hammer className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            🔨 Build Mode — Construct It Yourself
          </span>
        </div>
        <p className="text-[11px] font-semibold text-[var(--text-primary)]">{buildSpec.prompt}</p>
        <button
          onClick={() => setPhase("build")}
          className="px-3 py-1.5 rounded text-[9px] font-bold bg-amber-600 text-white hover:bg-amber-700"
        >
          Start Building →
        </button>
        <p className="text-[9px] text-[var(--text-muted)]">Exam-style: you construct the machine, system validates it.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-3">
      <p className="text-[10px] font-bold text-amber-400 uppercase">Build the machine</p>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Describe your DFA/states/transitions here..."
        className="w-full h-24 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[10px] font-mono outline-none focus:border-amber-500/50"
      />

      <div className="flex items-center gap-2">
        <button onClick={handleCheck} className="px-3 py-1.5 rounded text-[9px] font-bold bg-emerald-600 text-white hover:bg-emerald-700">Check Answer</button>
        <button onClick={handleReset} className="px-3 py-1.5 rounded text-[9px] font-bold bg-[var(--bg-surface)] border border-[var(--border)]">Reset</button>
      </div>

      {hintIdx < (buildSpec.hints?.length ?? 0) && (
        <div className="flex items-start gap-2 p-2 rounded bg-[var(--bg-surface)] border border-[var(--border)]">
          <HelpCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-400" />
          <div>
            <p className="text-[9px] font-bold text-amber-400">Hint {hintIdx + 1}/{buildSpec.hints?.length ?? 0}:</p>
            <p className="text-[10px] text-[var(--text-secondary)]">{buildSpec.hints?.[hintIdx]}</p>
            <button onClick={() => setHintIdx((i) => i + 1)} className="text-[9px] text-amber-400 mt-1">Next hint →</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]">
        <Lightbulb className="w-3 h-3" />
        Validation: {buildSpec.validation.join(" | ")}
      </div>
    </div>
  );
}