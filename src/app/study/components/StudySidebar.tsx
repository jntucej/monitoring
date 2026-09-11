"use client";

import React from "react";
import Link from "next/link";
import type { StudyUnit, CheatTopic } from "../types";
import { CheckCircle2, ChevronRight, Layers } from "lucide-react";

interface StudySidebarProps {
  units: Record<string, StudyUnit>;
  allTopics: CheatTopic[];
  activeUnitNumber: string;
  activeTopicId?: string;
  onSelectUnit: (unitNumber: string) => void;
  revisedTopicIds: Set<string>;
  accentMap?: Record<string, string>;
}

export function StudySidebar({
  units,
  allTopics,
  activeUnitNumber,
  activeTopicId,
  onSelectUnit,
  revisedTopicIds,
  accentMap = { I: "var(--unit-a)", II: "var(--unit-b)", III: "var(--unit-c)", IV: "#3b82f6", V: "#ec4899" },
}: StudySidebarProps) {
  return (
    <aside className="w-full space-y-4 text-[var(--text-primary)]">
      <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)] text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
        <Layers className="w-4 h-4 text-[var(--action-primary)]" />
        Syllabus Navigation
      </div>

      <div className="space-y-3">
        {Object.values(units).map((unit) => {
          const isActive = unit.unitNumber === activeUnitNumber;
          const unitTopics = allTopics.filter((t) => t.unitNumber === unit.unitNumber);
          const revisedCount = unitTopics.filter((t) => revisedTopicIds.has(t.id)).length;
          const accent = accentMap[unit.unitNumber] || "var(--unit-a)";

          return (
            <div
              key={unit.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isActive
                  ? "bg-[var(--bg-surface)] border-[var(--action-primary)]/50 shadow-md"
                  : "bg-[var(--bg-elevated)]/50 border-[var(--border)] hover:border-[var(--border-strong)]"
              }`}
            >
              <button
                onClick={() => onSelectUnit(unit.unitNumber)}
                className="w-full p-3 text-left flex items-start justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg text-white font-bold text-xs flex items-center justify-center shadow-sm" style={{ background: accent }}>
                      {unit.unitNumber}
                    </span>
                    <span className="font-bold text-sm text-[var(--text-primary)]">Unit {unit.unitNumber}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-1">{unit.subtitle}</p>

                  <div className="flex items-center gap-2 pt-1">
                    <div className="w-20 h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden border border-[var(--border)]">
                      <div className="h-full rounded-full transition-all" style={{ width: `${unitTopics.length > 0 ? (revisedCount / unitTopics.length) * 100 : 0}%`, background: accent }} />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)]">{revisedCount}/{unitTopics.length}</span>
                  </div>
                </div>

                <ChevronRight className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isActive ? "rotate-90 text-[var(--action-primary)]" : ""}`} />
              </button>

              {isActive && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-[var(--border)] bg-[var(--bg-surface)]/60">
                  {unit.categories.map((cat, idx) => {
                    const catTopics = unitTopics.filter((t) => cat.topicIds.includes(t.id));
                    if (catTopics.length === 0) return null;

                    return (
                      <div key={idx} className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] pt-1 px-2">{cat.name}</p>
                        <div className="space-y-0.5">
                          {catTopics.map((t) => {
                            const isTopicActive = t.id === activeTopicId;
                            const isRevised = revisedTopicIds.has(t.id);
                            return (
                              <Link
                                key={t.id}
                                href={`/study/${t.subjectId || "ai"}/topic/${t.id}`}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                  isTopicActive ? "bg-[var(--action-primary)] text-white font-bold shadow-sm" : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                                }`}
                              >
                                <span className="truncate pr-2">{t.title}</span>
                                {isRevised && <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${isTopicActive ? "text-white" : "text-emerald-400"}`} />}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
