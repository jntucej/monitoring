"use client";

import React, { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";

export function PumpingLemmaPlayground() {
  const [p, setP] = useState(3);
  const [yLen, setYLen] = useState(1);
  const [iVal, setIVal] = useState(2);

  const numA = p + (iVal - 1) * yLen;
  const numB = p;
  const isContradiction = iVal !== 1 && numA !== numB;

  const strW = "a".repeat(p) + "b".repeat(p);
  const strX = "a".repeat(p - yLen);
  const strY = "a".repeat(yLen);
  const strZ = "b".repeat(p);

  const pumpedStr = strX + strY.repeat(iVal) + strZ;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
          🧪 Pumping Lemma Proof Simulator (L = &#123;aⁿbⁿ | n ≥ 0&#125;)
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">Length p = {p}</label>
          <input type="range" min="2" max="5" value={p} onChange={(e) => setP(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">|y| = {yLen}</label>
          <input type="range" min="1" max={p} value={yLen} onChange={(e) => setYLen(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-muted)] block mb-0.5">Pump i = {iVal}</label>
          <input type="range" min="0" max="4" value={iVal} onChange={(e) => setIVal(Number(e.target.value))} className="w-full" />
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] font-mono text-xs space-y-1.5">
        <div>Original w = <span className="text-blue-400">{strX}</span><span className="text-purple-400 font-bold underline">{strY}</span><span className="text-emerald-400">{strZ}</span> (|w| = {2*p})</div>
        <div>Pumped xyⁱz = <span className="text-blue-400">{strX}</span><span className="text-purple-400 font-bold underline">{strY.repeat(iVal)}</span><span className="text-emerald-400">{strZ}</span></div>
        <div className="text-[11px] text-[var(--text-muted)]">Count: #a = {numA}, #b = {numB}</div>
      </div>

      <div className={`p-2.5 rounded-lg border flex items-center gap-2 text-xs font-bold ${isContradiction ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>
        {isContradiction ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
        <span>
          {isContradiction
            ? `CONTRADICTION! xy²z has ${numA} 'a's and ${numB} 'b's (${numA} ≠ ${numB}). String ∉ L ⟹ L is NOT regular!`
            : `i=1: String xy¹z = w remains inside language L.`}
        </span>
      </div>
    </div>
  );
}
