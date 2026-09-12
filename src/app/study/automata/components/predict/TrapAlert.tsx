"use client";

import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { TrapSpec } from "../../data/types";

interface TrapAlertProps {
  trap: TrapSpec;
  triggerOn?: string;
  onTriggered?: () => void;
}

export function TrapAlert({ trap, triggerOn, onTriggered }: TrapAlertProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const show = visible || (triggerOn !== undefined);

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 overflow-hidden">
      {triggerOn && !visible && (
        <button
          onClick={() => { setVisible(true); onTriggered?.(); }}
          className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <AlertTriangle className="w-3 h-3" />
          ⚠ Common Exam Trap — Click to reveal
          <X className="w-3 h-3 ml-auto" onClick={() => setDismissed(true)} />
        </button>
      )}

      {(visible || (!triggerOn)) && (
        <div>
          <div className="flex items-center justify-between px-3 py-2 bg-red-500/10 border-b border-red-500/20">
            <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              ⚠ TRAP ALERT
            </span>
            <button onClick={() => setDismissed(true)} className="text-[9px] text-red-400/60 hover:text-red-400">✕</button>
          </div>
          <div className="p-3 space-y-2">
            <p className="text-[11px] font-bold text-red-300">{trap.warning}</p>
            <p className="text-[10px] text-[var(--text-secondary)]">{trap.explanation}</p>
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300">
              ✅ Correct: {trap.correctBehavior}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}