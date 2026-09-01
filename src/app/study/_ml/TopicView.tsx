"use client";

import Link from "next/link";
import type { Topic } from "./types";
import { TopicVisual } from "./components/TopicVisual";
import { getTopic } from "./index";
import { Block, ListBlock, StepBlock } from "./blocks";
import { ArrowLeft, Lightbulb, Sparkles } from "lucide-react";

export function TopicView({ topic }: { topic: Topic }) {
  const related = (topic.relatedTopics ?? []).map((id) => getTopic(id)).filter(Boolean) as Topic[];

  return (
    <div className="space-y-3 pb-10">
      <Link href={`/study/ml/unit/${topic.unit}`} className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Unit {topic.unit}
      </Link>
      <h1 className="text-xl font-bold text-[var(--text-primary)]">{topic.title}</h1>
      {topic.definition && <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{topic.definition}</p>}
      {topic.why && <Block icon={<Lightbulb className="w-4 h-4" />} title="Why" body={topic.why} />}
      {topic.coreIdea && <Block icon={<Sparkles className="w-4 h-4" />} title="Core Idea" body={topic.coreIdea} />}

      {topic.visual && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Visual</p>
          <TopicVisual visual={topic.visual} />
        </div>
      )}

      {topic.formula && (
        <div className="rounded-2xl border border-[var(--action-primary)]/30 bg-[var(--action-primary)]/5 p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--action-primary)]">Formula</p>
          <p className="font-mono text-sm text-[var(--text-primary)]">{topic.formula.expression}</p>
          {topic.formula.symbols && (
            <ul className="text-[10px] text-[var(--text-secondary)] space-y-0.5">
              {Object.entries(topic.formula.symbols).map(([k,v]) => <li key={k}>{k}: {v}</li>)}
            </ul>
          )}
          {topic.formula.examNote && <p className="text-[10px] text-[var(--text-muted)] italic">{topic.formula.examNote}</p>}
        </div>
      )}

      {topic.steps?.length ? <StepBlock steps={topic.steps} /> : null}
      {topic.keyPoints?.length ? <ListBlock title="Key Points" items={topic.keyPoints} /> : null}
      {topic.advantages?.length ? <ListBlock title="Advantages" items={topic.advantages} tone="good" /> : null}
      {topic.limitations?.length ? <ListBlock title="Limitations" items={topic.limitations} tone="bad" /> : null}
      {topic.examPoints?.length ? <ListBlock title="Exam Points" items={topic.examPoints} tone="exam" /> : null}

      {topic.memoryTrigger && (
        <div className="rounded-2xl border border-[var(--action-primary)]/40 bg-[var(--action-primary)]/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--action-primary)] mb-1">Memory Trigger</p>
          <p className="text-xs text-[var(--text-primary)] font-medium">{topic.memoryTrigger}</p>
        </div>
      )}

      {related.length > 0 && (
        <div className="pt-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Related Concepts</p>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <Link key={r.id} href={`/study/ml/topic/${r.id}`} className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--action-primary)]">
                {r.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}