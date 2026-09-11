"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import Link from "next/link";
import { AI_TOPIC_MAP, AI_UNITS, ALL_AI_TOPICS } from "../../data";
import { StudyCard } from "../../../components/StudyCard";
import { StudyTOC } from "../../../components/StudyTOC";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

const UNIT_ACCENTS: Record<string, string> = {
  I: "var(--unit-a)",
  II: "var(--unit-b)",
  III: "var(--unit-c)",
  IV: "#3b82f6",
  V: "#ec4899",
};

export default function AiTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const topic = AI_TOPIC_MAP[id];
  if (!topic) return notFound();

  const unitNum = topic.unitNumber || (topic.unit as any);
  const unit = AI_UNITS[unitNum as "I" | "II" | "III" | "IV" | "V"];
  const unitTopics = ALL_AI_TOPICS.filter((t) => (t.unitNumber || t.unit) === unitNum);
  const currentIndex = unitTopics.findIndex((t) => t.id === topic.id);

  const prevTopic = currentIndex > 0 ? unitTopics[currentIndex - 1] : null;
  const nextTopic = currentIndex < unitTopics.length - 1 ? unitTopics[currentIndex + 1] : null;
  const siblings = unitTopics.filter((t) => t.id !== topic.id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 text-[var(--text-primary)]">
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <Link
          href="/study/ai/cheat"
          className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> All AI Cheat Sheets
        </Link>

        {unit && (
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
            {unit.title}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          <StudyCard
            topic={topic}
            mode="full"
            accentColor={UNIT_ACCENTS[unitNum] || "var(--unit-a)"}
          />

          {/* Stepper Bar */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)]">
            {prevTopic ? (
              <Link
                href={`/study/ai/topic/${prevTopic.id}`}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--action-primary)] transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <div className="text-left">
                  <span className="block text-[9px] font-semibold text-[var(--text-muted)] uppercase">Previous Topic</span>
                  <span className="truncate max-w-[140px] block">{prevTopic.title}</span>
                </div>
              </Link>
            ) : (
              <div />
            )}

            {nextTopic ? (
              <Link
                href={`/study/ai/topic/${nextTopic.id}`}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--action-primary)] transition-all ml-auto"
              >
                <div className="text-right">
                  <span className="block text-[9px] font-semibold text-[var(--text-muted)] uppercase">Next Topic</span>
                  <span className="truncate max-w-[140px] block">{nextTopic.title}</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>

        {/* Right Sidebar TOC */}
        <div className="hidden lg:block lg:col-span-4 sticky top-6">
          <StudyTOC topic={topic} siblings={siblings} />
        </div>
      </div>
    </div>
  );
}
