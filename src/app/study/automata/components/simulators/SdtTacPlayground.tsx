"use client";

import React, { useState } from "react";

export function SdtTacPlayground() {
  const [tab, setTab] = useState<"tac" | "dag">("tac");

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
          📝 TAC, Quadruples & Triples Data Structure Generator
        </span>
        <div className="flex gap-1">
          <button onClick={() => setTab("tac")} className={`px-2 py-0.5 rounded text-[9px] font-bold ${tab === "tac" ? "bg-pink-600 text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)]"}`}>TAC & Tables</button>
          <button onClick={() => setTab("dag")} className={`px-2 py-0.5 rounded text-[9px] font-bold ${tab === "dag" ? "bg-pink-600 text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)]"}`}>AST vs DAG</button>
        </div>
      </div>

      {tab === "tac" && (
        <div className="space-y-2 text-xs">
          <p className="text-[11px] text-[var(--text-muted)] font-medium">Expression `a = b * -c + b * -c` Data Structures:</p>
          <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
              <div className="font-bold text-pink-400 border-b border-[var(--border)] pb-0.5">Quadruples (op, arg1, arg2, res)</div>
              <div>(1) uminus, c, -, t1</div>
              <div>(2) mult, b, t1, t2</div>
              <div>(3) uminus, c, -, t3</div>
              <div>(4) mult, b, t3, t4</div>
              <div>(5) add, t2, t4, t5</div>
              <div>(6) assign, t5, -, a</div>
            </div>

            <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
              <div className="font-bold text-pink-400 border-b border-[var(--border)] pb-0.5">Triples (op, arg1, arg2)</div>
              <div>(0) uminus, c, -</div>
              <div>(1) mult, b, (0)</div>
              <div>(2) uminus, c, -</div>
              <div>(3) mult, b, (2)</div>
              <div>(4) add, (1), (3)</div>
              <div>(5) assign, a, (4)</div>
            </div>
          </div>
        </div>
      )}

      {tab === "dag" && (
        <div className="space-y-2 text-xs">
          <p className="text-[11px] text-[var(--text-muted)] font-medium">AST vs DAG Comparison for `(a + b) * (a + b)`:</p>
          <div className="grid grid-cols-2 gap-2 font-mono text-[10.5px]">
            <div className="p-2 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">
              <div className="font-bold border-b border-purple-500/20 pb-0.5 mb-1">Abstract Syntax Tree (AST)</div>
              <div>Creates 2 separate `+` nodes for `(a+b)`. Duplicate computations present.</div>
            </div>
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <div className="font-bold border-b border-emerald-500/20 pb-0.5 mb-1">Directed Acyclic Graph (DAG)</div>
              <div>Unifies identical subexpression `(a+b)` into 1 shared node! Saves CPU instructions.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
