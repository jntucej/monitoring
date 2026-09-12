"use client";

import React, { useState, useEffect } from "react";
import { Play, SkipForward, RotateCcw, CheckCircle2 } from "lucide-react";

export function PdaPlayground() {
  const [inputStr, setInputStr] = useState("aabb");
  const [stepIndex, setStepIndex] = useState(0);
  const [stack, setStack] = useState<string[]>(["Z0"]);
  const [state, setState] = useState("q0");
  const [mode, setMode] = useState<"final" | "empty">("final");
  const [isPlaying, setIsPlaying] = useState(false);

  const resetSim = () => {
    setStepIndex(0);
    setStack(["Z0"]);
    setState("q0");
    setIsPlaying(false);
  };

  const stepForward = () => {
    if (stepIndex < inputStr.length) {
      const char = inputStr[stepIndex];
      if (char === "a") {
        setStack((prev) => ["A", ...prev]);
        setState("q0");
      } else if (char === "b") {
        setStack((prev) => prev.slice(1));
        setState("q1");
      }
      setStepIndex((prev) => prev + 1);
    } else if (state === "q1" && mode === "empty" && stack.length > 0) {
      setStack([]);
      setState("q2");
    } else if (state === "q1" && mode === "final") {
      setState("q2");
    }
  };

  useEffect(() => {
    let timer: any;
    if (isPlaying && (stepIndex < inputStr.length || state !== "q2")) {
      timer = setTimeout(stepForward, 600);
    } else {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, state]);

  const isFinished = stepIndex >= inputStr.length && (mode === "final" ? state === "q2" : stack.length === 0);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
          📥 Pushdown Automata (PDA) Stack Simulator
        </span>
        <div className="flex gap-1">
          <button onClick={() => { setMode("final"); resetSim(); }} className={`px-2 py-0.5 rounded text-[9px] font-bold ${mode === "final" ? "bg-purple-600 text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)]"}`}>L(P): Final State</button>
          <button onClick={() => { setMode("empty"); resetSim(); }} className={`px-2 py-0.5 rounded text-[9px] font-bold ${mode === "empty" ? "bg-purple-600 text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)]"}`}>N(P): Empty Stack</button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputStr}
          onChange={(e) => { setInputStr(e.target.value); resetSim(); }}
          className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-mono outline-none"
        />
        <button onClick={() => setIsPlaying(!isPlaying)} disabled={isFinished} className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40"><Play className="w-3.5 h-3.5" /></button>
        <button onClick={stepForward} disabled={isFinished} className="p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] disabled:opacity-40"><SkipForward className="w-3.5 h-3.5" /></button>
        <button onClick={resetSim} className="p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)]"><RotateCcw className="w-3.5 h-3.5" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Input Tape */}
        <div className="space-y-1">
          <span className="text-[10px] text-[var(--text-muted)]">Input Tape:</span>
          <div className="flex items-center gap-1 font-mono">
            {inputStr.split("").map((ch, idx) => (
              <span key={idx} className={`w-6 h-6 rounded flex items-center justify-center font-bold border ${idx === stepIndex ? "bg-purple-600 text-white scale-110" : idx < stepIndex ? "bg-[var(--bg-surface)] opacity-50" : "bg-[var(--bg-surface)]"}`}>{ch}</span>
            ))}
          </div>
        </div>

        {/* Stack View */}
        <div className="space-y-1">
          <span className="text-[10px] text-[var(--text-muted)]">LIFO Stack:</span>
          <div className="flex flex-col-reverse items-center gap-0.5 p-1 bg-[var(--bg-surface)] rounded-lg border border-[var(--border)] min-h-[50px] font-mono text-xs">
            {stack.length === 0 ? (
              <span className="text-[9px] text-emerald-400 font-bold">∅ (Empty Stack!)</span>
            ) : (
              stack.map((item, idx) => (
                <span key={idx} className={`w-full text-center py-0.5 rounded font-bold border ${idx === 0 ? "bg-purple-600/30 border-purple-500/40 text-purple-300" : "bg-[var(--bg-elevated)] border-transparent"}`}>{item}</span>
              ))
            )}
          </div>
        </div>
      </div>

      {isFinished && (
        <div className="p-2.5 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>
            {mode === "final" ? `L(P) ACCEPT: Halted in final state '${state}'.` : `N(P) ACCEPT: Stack cleared completely.`}
          </span>
        </div>
      )}
    </div>
  );
}
