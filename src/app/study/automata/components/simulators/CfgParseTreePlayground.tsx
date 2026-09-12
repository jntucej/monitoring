"use client";

import React, { useState } from "react";

export function CfgParseTreePlayground({ topicId }: { topicId: string }) {
  const isAmbiguity = topicId.includes("ambiguity") || topicId.includes("disambiguation");
  const [mode, setMode] = useState<"derivation" | "ambiguity">(isAmbiguity ? "ambiguity" : "derivation");
  const [derivationType, setDerivationType] = useState<"lmd" | "rmd">("lmd");

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
          🌳 CFG Derivation & Parse Tree Inspector
        </span>
        <div className="flex gap-1">
          <button onClick={() => setMode("derivation")} className={`px-2 py-0.5 rounded text-[9px] font-bold ${mode === "derivation" ? "bg-purple-600 text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)]"}`}>Derivations</button>
          <button onClick={() => setMode("ambiguity")} className={`px-2 py-0.5 rounded text-[9px] font-bold ${mode === "ambiguity" ? "bg-purple-600 text-white" : "bg-[var(--bg-surface)] text-[var(--text-muted)]"}`}>Ambiguity</button>
        </div>
      </div>

      {mode === "derivation" && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Derivation steps for string `aabb`:</span>
            <div className="flex gap-1">
              <button onClick={() => setDerivationType("lmd")} className={`px-2 py-0.5 rounded text-[9px] font-bold ${derivationType === "lmd" ? "bg-purple-600 text-white" : "bg-[var(--bg-surface)]"}`}>Leftmost (LMD)</button>
              <button onClick={() => setDerivationType("rmd")} className={`px-2 py-0.5 rounded text-[9px] font-bold ${derivationType === "rmd" ? "bg-purple-600 text-white" : "bg-[var(--bg-surface)]"}`}>Rightmost (RMD)</button>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] font-mono text-[11px] space-y-1">
            {derivationType === "lmd" ? (
              <>
                <div>S ⇒ <span className="text-purple-400 font-bold">aSb</span></div>
                <div>⇒ aa<span className="text-purple-400 font-bold">S</span>bb</div>
                <div>⇒ aa<span className="text-emerald-400 font-bold">ε</span>bb</div>
                <div className="text-emerald-400 font-bold">⇒ aabb (LMD complete!)</div>
              </>
            ) : (
              <>
                <div>S ⇒ <span className="text-purple-400 font-bold">aSb</span></div>
                <div>⇒ a<span className="text-purple-400 font-bold">aSb</span>b</div>
                <div>⇒ aa<span className="text-emerald-400 font-bold">ε</span>bb</div>
                <div className="text-emerald-400 font-bold">⇒ aabb (RMD complete!)</div>
              </>
            )}
          </div>
        </div>
      )}

      {mode === "ambiguity" && (
        <div className="space-y-2 text-xs">
          <p className="text-[11px] text-[var(--text-secondary)] font-semibold">2 Parse Trees for `id + id * id` (Ambiguous Grammar E → E+E | E*E | id):</p>
          <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="p-2 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">
              <div className="font-bold border-b border-purple-500/20 pb-1 mb-1">Tree 1: '+' first</div>
              <div>(id + id) * id</div>
              <div className="text-[9px] text-[var(--text-muted)] mt-1">Evaluates addition first.</div>
            </div>
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <div className="font-bold border-b border-emerald-500/20 pb-1 mb-1">Tree 2: '*' first</div>
              <div>id + (id * id)</div>
              <div className="text-[9px] text-[var(--text-muted)] mt-1">Evaluates multiplication first.</div>
            </div>
          </div>
          <div className="p-2 rounded bg-[var(--bg-surface)] border border-[var(--border)] text-[10.5px]">
            <span className="font-bold text-purple-400">Disambiguated Fix:</span> Stratify grammar into <span className="font-mono font-bold">E → E + T | T</span>, <span className="font-mono font-bold">T → T * F | F</span>, <span className="font-mono font-bold">F → id</span> to enforce '*' over '+' precedence!
          </div>
        </div>
      )}
    </div>
  );
}
