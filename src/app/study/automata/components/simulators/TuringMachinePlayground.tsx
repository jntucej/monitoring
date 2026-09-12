"use client";

import React, { useState, useEffect } from "react";
import { Play, SkipForward, RotateCcw, CheckCircle2 } from "lucide-react";

export function TuringMachinePlayground() {
  const [tape, setTape] = useState<string[]>(["B", "1", "1", "0", "B", "B"]);
  const [headPos, setHeadPos] = useState(1);
  const [state, setState] = useState("q0");
  const [isPlaying, setIsPlaying] = useState(false);

  const resetSim = () => {
    setTape(["B", "1", "1", "0", "B", "B"]);
    setHeadPos(1);
    setState("q0");
    setIsPlaying(false);
  };

  const stepForward = () => {
    if (state === "q0" && tape[headPos] === "1") {
      const nextTape = [...tape];
      nextTape[headPos] = "X";
      setTape(nextTape);
      setHeadPos((p) => p + 1);
    } else if (state === "q0" && tape[headPos] === "0") {
      setState("q1");
      setHeadPos((p) => p + 1);
    } else if (state === "q1" && tape[headPos] === "B") {
      setState("qAccept");
    }
  };

  useEffect(() => {
    let timer: any;
    if (isPlaying && state !== "qAccept") {
      timer = setTimeout(stepForward, 600);
    } else {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, state, headPos]);

  const isAccepted = state === "qAccept";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
          🤖 Turing Machine Tape & Head Simulator
        </span>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-600/20 text-purple-300">State: {state}</span>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setIsPlaying(!isPlaying)} disabled={isAccepted} className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40"><Play className="w-3.5 h-3.5" /></button>
        <button onClick={stepForward} disabled={isAccepted} className="p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] disabled:opacity-40"><SkipForward className="w-3.5 h-3.5" /></button>
        <button onClick={resetSim} className="p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)]"><RotateCcw className="w-3.5 h-3.5" /></button>
      </div>

      {/* Infinite Tape Strip */}
      <div className="space-y-1">
        <span className="text-[10px] text-[var(--text-muted)]">Infinite Tape:</span>
        <div className="flex items-center justify-center gap-1 font-mono text-xs overflow-x-auto py-1">
          {tape.map((ch, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span className={`w-8 h-8 rounded flex items-center justify-center font-bold border ${idx === headPos ? "bg-purple-600 text-white scale-110 shadow ring-2 ring-purple-400" : "bg-[var(--bg-surface)]"}`}>{ch}</span>
              {idx === headPos && <span className="text-[9px] text-purple-400 font-bold mt-0.5">▲ HEAD</span>}
            </div>
          ))}
        </div>
      </div>

      {isAccepted && (
        <div className="p-2.5 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>HALTED & ACCEPTED: Turing Machine entered final state 'qAccept'.</span>
        </div>
      )}
    </div>
  );
}
