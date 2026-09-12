"use client";

import React, { useState, useEffect } from "react";
import { Play, SkipForward, RotateCcw, CheckCircle2, XCircle } from "lucide-react";

export function AutomataPlayground({ topicId }: { topicId: string }) {
  const [inputStr, setInputStr] = useState("0101");
  const [stepIndex, setStepIndex] = useState(0);
  const [currentState, setCurrentState] = useState("q0");
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setInputStr(topicId === "nfa-text-search-app" ? "abwebcd" : "0101");
    setStepIndex(0);
    setCurrentState("q0");
    setIsPlaying(false);
  }, [topicId]);

  const transitions: Record<string, Record<string, string>> = {
    q0: { "0": "q1", "1": "q0", w: "q1" },
    q1: { "0": "q1", "1": "q2", e: "q2" },
    q2: { "0": "q1", "1": "q0", b: "q3" },
  };

  const finalStates = new Set(["q2", "q3"]);

  const stepForward = () => {
    if (stepIndex < inputStr.length) {
      const char = inputStr[stepIndex];
      const next = transitions[currentState]?.[char] || currentState;
      setCurrentState(next);
      setStepIndex((prev) => prev + 1);
    }
  };

  const resetSim = () => {
    setStepIndex(0);
    setCurrentState("q0");
    setIsPlaying(false);
  };

  useEffect(() => {
    let timer: any;
    if (isPlaying && stepIndex < inputStr.length) {
      timer = setTimeout(stepForward, 600);
    } else {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex]);

  const isFinished = stepIndex >= inputStr.length;
  const isAccepted = isFinished && finalStates.has(currentState);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
          ⚙️ Executable Automata Simulator
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputStr}
          onChange={(e) => { setInputStr(e.target.value); resetSim(); }}
          className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-mono outline-none"
        />
        <button onClick={() => setIsPlaying(!isPlaying)} disabled={isFinished} className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40"><Play className="w-3.5 h-3.5" /></button>
        <button onClick={stepForward} disabled={isFinished} className="p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] disabled:opacity-40"><SkipForward className="w-3.5 h-3.5" /></button>
        <button onClick={resetSim} className="p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)]"><RotateCcw className="w-3.5 h-3.5" /></button>
      </div>

      <div className="flex items-center gap-1 font-mono text-xs overflow-x-auto py-1">
        <span className="text-[10px] text-[var(--text-muted)]">Input Tape:</span>
        {inputStr.split("").map((ch, idx) => (
          <span key={idx} className={`w-6 h-6 rounded flex items-center justify-center font-bold border ${idx === stepIndex ? "bg-purple-600 text-white scale-110" : idx < stepIndex ? "bg-[var(--bg-surface)] opacity-50" : "bg-[var(--bg-surface)]"}`}>{ch}</span>
        ))}
      </div>

      <div className="flex items-center justify-around py-2 bg-[var(--bg-surface)] rounded-xl border border-[var(--border)]">
        {["q0", "q1", "q2"].map((st) => (
          <div key={st} className="flex flex-col items-center gap-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs border-2 ${finalStates.has(st) ? "border-double border-4" : ""} ${currentState === st ? "bg-purple-600 text-white ring-4 ring-purple-500/20 scale-110" : "bg-[var(--bg-elevated)]"}`}>{st}</div>
            <span className="text-[9px] text-[var(--text-muted)]">{st === "q0" ? "Start" : finalStates.has(st) ? "Accept" : "State"}</span>
          </div>
        ))}
      </div>

      {isFinished && (
        <div className={`p-2.5 rounded-lg border flex items-center gap-2 text-xs font-bold ${isAccepted ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
          {isAccepted ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span>{isAccepted ? `ACCEPTED: Landed in final state '${currentState}'.` : `REJECTED: Halted in non-final state '${currentState}'.`}</span>
        </div>
      )}
    </div>
  );
}
