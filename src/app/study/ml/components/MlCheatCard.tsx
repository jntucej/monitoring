"use client";

import { useState, useEffect } from "react";
import type { CheatTopic } from "../data/types";
import { renderPart1 } from "./DiagramPart1";
import { renderPart2 } from "./DiagramPart2";
import { Bookmark, BookmarkCheck, Lightbulb, Target } from "lucide-react";

function Visual({ visual }: { visual: CheatTopic["visual"] }) {
  if (!visual) return null;
  return ["tree", "pipeline", "flow", "sigmoid"].includes(visual.type)
    ? renderPart1(visual.type, visual.data)
    : renderPart2(visual.type, visual.data);
}

export function MlCheatCard({ topic }: { topic: CheatTopic }) {
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    try {
      setBookmarked(localStorage.getItem(`ml-bookmark-${topic.id}`) === "true");
    } catch {}
  }, [topic.id]);

  const toggleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    try {
      if (next) localStorage.setItem(`ml-bookmark-${topic.id}`, "true");
      else localStorage.removeItem(`ml-bookmark-${topic.id}`);
    } catch {}
  };

  return (
    <div className="glass-card rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">{topic.title}</h3>
        <button onClick={toggleBookmark} className="text-[var(--text-muted)] hover:text-[var(--action-primary)]">
          {bookmarked ? <BookmarkCheck className="w-4 h-4 text-[var(--action-primary)]" /> : <Bookmark className="w-4 h-4" />}
        </button>
      </div>

      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{topic.definition}</p>

      {topic.coreIdea && (
        <div className="p-2 rounded-lg bg-[var(--action-primary)]/5 border border-[var(--action-primary)]/20">
          <p className="text-[10.5px] text-[var(--action-primary)] font-semibold">💡 {topic.coreIdea}</p>
        </div>
      )}

      {topic.visual && <Visual visual={topic.visual} />}

      {topic.formula && (
        <div className="rounded-lg border border-[var(--unit-c)]/40 bg-[var(--unit-c-soft)] px-3 py-2 space-y-1">
          <p className="font-mono text-xs font-bold text-[var(--unit-c)]">{topic.formula.expression}</p>
          {topic.formula.symbols && (
            <p className="text-[9px] text-[var(--text-muted)]">
              {Object.entries(topic.formula.symbols).map(([k, v]) => `${k}: ${v}`).join("  •  ")}
            </p>
          )}
                    {topic.formula.examNote && <p className="text-[9px] text-[var(--action-warning)] italic">⚠ {topic.formula.examNote}</p>}
        </div>
      )}

      {topic.steps && (
        <ol className="space-y-0.5">
          {topic.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[10.5px] text-[var(--text-secondary)]">
              <span className="w-3.5 h-3.5 rounded-full bg-[var(--action-primary)]/15 text-[8px] font-bold text-[var(--action-primary)] flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      )}

      {topic.differences && (
        <div className="space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Key Differences</p>
          {topic.differences.map((d, i) => (
            <div key={i} className="grid grid-cols-3 text-[10px] gap-1">
              <span className="font-medium text-[var(--text-primary)]">{d.feature}</span>
                            <span className="text-[var(--action-success)]">{d.valA}</span>
              <span className="text-[var(--action-danger)]">{d.valB}</span>
            </div>
          ))}
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
        <div className="flex items-start gap-1.5 rounded-lg bg-[var(--action-primary)]/5 border border-[var(--action-primary)]/20 px-2.5 py-1.5">
          <Lightbulb className="w-3 h-3 text-[var(--action-primary)] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] font-medium text-[var(--action-primary)]">{topic.memoryTrigger}</p>
        </div>
      )}
    </div>
  );
}
