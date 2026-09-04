"use client";

import type { AiCheatTopic } from "../data/types";
import { AiVisual } from "./AiVisual";
import { Lightbulb, Target } from "lucide-react";

const UNIT_ACCENT: Record<"I" | "II" | "III", string> = {
  I: "var(--unit-a)",
  II: "var(--unit-b)",
  III: "var(--unit-c)",
};

export function AiCheatCard({ topic }: { topic: AiCheatTopic }) {
  const accent = UNIT_ACCENT[topic.unit] ?? "var(--unit-a)";
  const diffRows = topic.differences ?? [];
  const hasDiff = diffRows.length > 0;
  const has3col = diffRows.some((r) => (r as any).valC !== undefined);

  return (
    <div className="glass-card rounded-xl p-4 space-y-3" style={{ ["--unit-accent" as any]: accent }}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">{topic.title}</h3>
        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border" style={{ color: "var(--unit-accent)", borderColor: "var(--unit-accent)", background: `color-mix(in srgb, ${accent} 15%, transparent)` }}>
          Unit {topic.unit}
        </span>
      </div>

      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{topic.definition}</p>

      {topic.coreIdea && (
        <div className="p-2 rounded-lg border" style={{ borderColor: "var(--unit-accent)", background: `color-mix(in srgb, ${accent} 12%, transparent)` }}>
          <p className="text-[10.5px] font-semibold" style={{ color: "var(--unit-accent)" }}>💡 {topic.coreIdea}</p>
        </div>
      )}

      {topic.visual && <AiVisual visual={topic.visual} />}

      {topic.formula && (
        <div className="rounded-lg border px-3 py-2 space-y-1" style={{ borderColor: "var(--unit-accent)", background: `color-mix(in srgb, ${accent} 8%, transparent)` }}>
          <p className="font-mono text-xs font-bold" style={{ color: "var(--unit-accent)" }}>{topic.formula.expression}</p>
          {topic.formula.symbols && (
            <p className="text-[9px] text-[var(--text-muted)]">
              {Object.entries(topic.formula.symbols).map(([k, v]) => `${k}: ${v}`).join("  •  ")}
            </p>
          )}
          {topic.formula.examNote && <p className="text-[9px] italic text-[var(--action-warning)]">⚠ {topic.formula.examNote}</p>}
        </div>
      )}

      {topic.steps && (
        <ol className="space-y-0.5">
          {topic.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[10.5px] text-[var(--text-secondary)]">
              <span className="w-3.5 h-3.5 rounded-full bg-[var(--unit-a)] text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      )}

      {topic.keyPoints && (
        <div className="space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Key Points</p>
          {topic.keyPoints.map((k, i) => (
            <p key={i} className="text-[10.5px] text-[var(--text-secondary)] pl-3 border-l border-[var(--border-strong)]">{k}</p>
          ))}
        </div>
      )}

      {hasDiff && (
        <div className="space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Key Differences</p>
          <div className="rounded-lg border border-[var(--border)] overflow-hidden">
            <div className="grid bg-[var(--bg-elevated)] text-[10px] font-bold text-[var(--text-muted)] border-b border-[var(--border)]" style={{ gridTemplateColumns: has3col ? "1fr 1fr 1fr" : "1fr 1fr" }}>
              <div className="p-2">Feature</div>
              <div className="p-2 border-l border-[var(--border)] text-center">A</div>
              <div className="p-2 border-l border-[var(--border)] text-center">B</div>
            </div>
            {diffRows.map((d, i) => (
              <div key={i} className={`grid text-[10.5px] border-b border-[var(--border)] last:border-0 ${i % 2 === 0 ? "bg-[var(--bg-surface)]/40" : ""}`} style={{ gridTemplateColumns: has3col ? "1fr 1fr 1fr" : "1fr 1fr" }}>
                <div className="p-2 font-medium text-[var(--text-primary)]">{d.feature}</div>
                <div className="p-2 text-[var(--text-secondary)] border-l border-[var(--border)] text-center">{(d as any).valA}</div>
                <div className="p-2 text-[var(--text-secondary)] border-l border-[var(--border)] text-center">{(d as any).valB}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topic.examPoints && (
        <div className="space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--action-warning)] flex items-center gap-1"><Target className="w-2.5 h-2.5" /> Exam Points</p>
          {topic.examPoints.map((p, i) => (
            <p key={i} className="text-[10.5px] text-[var(--text-secondary)] pl-3 border-l border-[var(--action-warning)]/40">{p}</p>
          ))}
        </div>
      )}

      {topic.memoryTrigger && (
        <div className="flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 border" style={{ borderColor: "var(--unit-accent)", background: `color-mix(in srgb, ${accent} 10%, transparent)` }}>
          <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "var(--unit-accent)" }} />
          <p className="text-[10px] font-medium" style={{ color: "var(--unit-accent)" }}>{topic.memoryTrigger}</p>
        </div>
      )}
    </div>
  );
}