"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronLeft, RotateCcw } from "lucide-react";

export function CompilerPipelinePlayground() {
  const [phase, setPhase] = useState(0);

  const phases = [
    {
      name: "1. Lexical Analysis (Scanner)",
      desc: "Reads character stream and emits tokens `<token_name, attribute_value>`.",
      output: "Tokens: <id, 1>  <=>  <id, 2>  <+>  <id, 3>  <*>  <num, 60>\nSymbol Table: id1='position', id2='initial', id3='rate'",
    },
    {
      name: "2. Syntax Analysis (Parser)",
      desc: "Verifies token structure against Context-Free Grammar and builds Parse Tree.",
      output: "Parse Tree:\n       =\n      / \\\n    id1   +\n         / \\\n       id2  *\n           / \\\n         id3  60",
    },
    {
      name: "3. Semantic Analysis",
      desc: "Checks types, scope rules, and performs implicit type coercions.",
      output: "Checked Syntax Tree:\n       =\n      / \\\n    id1   +\n         / \\\n       id2  *\n           / \\\n         id3  inttofloat(60)",
    },
    {
      name: "4. Intermediate Code Generator (ICG)",
      desc: "Generates machine-independent Three-Address Code (TAC).",
      output: "Three-Address Code (TAC):\nt1 = inttofloat(60)\nt2 = id3 * t1\nt3 = id2 + t2\nid1 = t3",
    },
    {
      name: "5. Code Optimizer",
      desc: "Improves intermediate code by removing redundant instructions & constant folding.",
      output: "Optimized TAC:\nt1 = id3 * 60.0\nid1 = id2 + t1",
    },
    {
      name: "6. Code Generator",
      desc: "Emits target assembly machine instructions.",
      output: "Target Assembly (x86 / ARM):\nLDF R2, id3\nMULF R2, R2, #60.0\nADDF R1, R2, id2\nSTF id1, R1",
    },
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
          ⚙️ Compiler 6-Phase Execution Pipeline Simulator
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPhase(Math.max(0, phase - 1))} disabled={phase === 0} className="p-1 rounded bg-[var(--bg-surface)] border border-[var(--border)] disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <span className="text-[10px] font-mono px-1.5">{phase + 1}/{phases.length}</span>
          <button onClick={() => setPhase(Math.min(phases.length - 1, phase + 1))} disabled={phase === phases.length - 1} className="p-1 rounded bg-[var(--bg-surface)] border border-[var(--border)] disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
          <button onClick={() => setPhase(0)} className="p-1 rounded bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)]"><RotateCcw className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-blue-500/30 space-y-1.5 text-xs">
        <h4 className="font-bold text-blue-400">{phases[phase].name}</h4>
        <p className="text-[11px] text-[var(--text-secondary)]">{phases[phase].desc}</p>
        <pre className="p-2.5 rounded bg-slate-900 text-slate-100 font-mono text-[10.5px] leading-relaxed overflow-x-auto whitespace-pre-wrap">
          {phases[phase].output}
        </pre>
      </div>
    </div>
  );
}
