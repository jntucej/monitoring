"use client";

import React from "react";
import Link from "next/link";
import type { CheatTopic } from "../types";
import { ListFilter, ShieldCheck, ArrowRight } from "lucide-react";

interface StudyTOCProps {
  topic?: CheatTopic;
  siblings?: CheatTopic[];
}

export function StudyTOC({ topic, siblings = [] }: StudyTOCProps) {
  if (!topic) return null;

  return (
    <aside className="w-full space-y-4 text-xs">
      {/* On This Page Heading */}
      <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)] font-bold uppercase tracking-wider text-[var(--text-muted)]">
        <ListFilter className="w-4 h-4 text-[var(--action-primary)]" />
        On This Page
      </div>

      <div className="space-y-2">
        <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] space-y-2">
          <p className="font-bold text-[var(--text-primary)]">{topic.title}</p>
          <div className="flex flex-wrap gap-1 text-[10px]">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
              {topic.tier}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[var(--bg-surface)] text-[var(--text-secondary)] font-bold border border-[var(--border)]">
              {topic.kind}
            </span>
          </div>
        </div>

        {/* Complexity Summary Pill (if algorithm/numerical) */}
        {topic.complexity && (
          <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-1.5">
            <p className="font-bold text-[10px] uppercase text-[var(--text-muted)] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Complexity Profile
            </p>
            {topic.complexity.time && (
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Time:</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">{topic.complexity.time}</span>
              </div>
            )}
            {topic.complexity.space && (
              <div className="flex justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Space:</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">{topic.complexity.space}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Siblings / Related Topics in Unit */}
      {siblings.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[var(--border)]">
          <p className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">
            Related In Unit {topic.unitNumber}
          </p>
          <div className="space-y-1">
            {siblings.slice(0, 6).map((s) => (
              <Link
                key={s.id}
                href={`/study/${s.subjectId || "ai"}/topic/${s.id}`}
                className="group flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--action-primary)] transition-all"
              >
                <span className="truncate pr-1">{s.title}</span>
                <ArrowRight className="w-3 h-3 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
