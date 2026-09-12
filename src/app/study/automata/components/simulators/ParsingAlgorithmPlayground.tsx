"use client";

import React, { useState } from "react";

export function ParsingAlgorithmPlayground() {
  const [tab, setTab] = useState<"first-follow" | "shift-reduce">("first-follow");
  const [srStep, setSrStep] = useState(0);

  const srSteps = [
    { stack: "$", input: "id * id + id $", action: "Shift 'id'" },
    { stack: "$ id", input: "* id + id $", action: "Reduce F → id" },
    { stack: "$ F", input: "* id + id $", action: "Reduce T → F" },
    { stack: "$ T", input: "* id + id $", action: "Shift '*'" },
    { stack: "$ T *", input: "id + id $", action: "Shift 'id'" },
    { stack: "$ T * id", input: "+ id $", action: "Reduce F → id" },
    { stack: "$ T * F", input: "+ id $", action: "Reduce T → T * F (Handle Pruned!)" },
    { stack: "$ T", input: "+ id $", action: "Reduce E → T" },
    { stack: "$ E", input: "+ id $", action: "Shift '+'" },
    { stack: "$ E +", input: "id $", action: "Shift 'id'" },
    { stack: "$ E + id", input: "$", action: "Reduce F → id" },
    { stack: "$ E + F", input: "$", action: "Reduce T → F" },
    { stack: "$ E + T", input: "$", action: "Reduce E → E + T" },
    { stack: "$ E", input: "$", action: "ACCEPT!" },
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
          ⚡ Interactive Parsing Algorithm Simulator
        </span>
        <div className="flex gap-1">
          <button onClick={() => setTab("first-follow")} className={`px-2 py-0.5 rounded text-[9px] font-bold ${tab === "first-follow" ? "bg-pink-600 text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)]"}`}>FIRST & FOLLOW</button>
          <button onClick={() => setTab("shift-reduce")} className={`px-2 py-0.5 rounded text-[9px] font-bold ${tab === "shift-reduce" ? "bg-pink-600 text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)]"}`}>Shift-Reduce LR</button>
        </div>
      </div>

      {tab === "first-follow" && (
        <div className="space-y-2 text-xs">
          <p className="text-[11px] text-[var(--text-muted)] font-medium">FIRST & FOLLOW Sets for Grammar `E → T E'`, `E' → + T E' | ε`, `T → F T'`, `T' → * F T' | ε`, `F → ( E ) | id`:</p>
          <div className="rounded-lg border border-[var(--border)] overflow-hidden font-mono text-[10px]">
            <div className="grid grid-cols-3 bg-[var(--bg-surface)] p-2 font-bold text-[var(--text-muted)] border-b border-[var(--border)]">
              <div>Non-Terminal</div>
              <div>FIRST Set</div>
              <div>FOLLOW Set</div>
            </div>
            <div className="grid grid-cols-3 p-2 border-b border-[var(--border)]"><div className="font-bold text-pink-400">E</div><div>&#123; (, id &#125;</div><div>&#123; ), $ &#125;</div></div>
            <div className="grid grid-cols-3 p-2 border-b border-[var(--border)]"><div className="font-bold text-pink-400">E'</div><div>&#123; +, ε &#125;</div><div>&#123; ), $ &#125;</div></div>
            <div className="grid grid-cols-3 p-2 border-b border-[var(--border)]"><div className="font-bold text-pink-400">T</div><div>&#123; (, id &#125;</div><div>&#123; +, ), $ &#125;</div></div>
            <div className="grid grid-cols-3 p-2 border-b border-[var(--border)]"><div className="font-bold text-pink-400">T'</div><div>&#123; *, ε &#125;</div><div>&#123; +, ), $ &#125;</div></div>
            <div className="grid grid-cols-3 p-2 bg-pink-500/10"><div className="font-bold text-pink-400">F</div><div>&#123; (, id &#125;</div><div>&#123; *, +, ), $ &#125;</div></div>
          </div>
        </div>
      )}

      {tab === "shift-reduce" && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-secondary)] font-semibold">Shift-Reduce Trace for `id * id + id`:</span>
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <button onClick={() => setSrStep(Math.max(0, srStep - 1))} disabled={srStep === 0} className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border)] disabled:opacity-30">Prev</button>
              <span>{srStep + 1}/{srSteps.length}</span>
              <button onClick={() => setSrStep(Math.min(srSteps.length - 1, srStep + 1))} disabled={srStep === srSteps.length - 1} className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border)] disabled:opacity-30">Next</button>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-pink-500/30 font-mono text-[11px] space-y-1">
            <div>Stack: <span className="font-bold text-pink-400">{srSteps[srStep].stack}</span></div>
            <div>Input: <span className="text-[var(--text-secondary)]">{srSteps[srStep].input}</span></div>
            <div className="p-1.5 rounded bg-pink-600/15 text-pink-300 font-bold mt-1">Action: {srSteps[srStep].action}</div>
          </div>
        </div>
      )}
    </div>
  );
}
