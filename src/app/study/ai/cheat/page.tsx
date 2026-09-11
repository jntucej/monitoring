"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { StudyHeader } from "../../layout";
import { ALL_AI_TOPICS, AI_UNITS } from "../data";
import { StudyCard, type DisplayMode } from "../../components/StudyCard";
import { StudySidebar } from "../../components/StudySidebar";
import { StudyTOC } from "../../components/StudyTOC";
import { ArrowLeft, Search, Zap, Sparkles, BookOpen } from "lucide-react";

const UNIT_ACCENTS: Record<string, string> = {
  I: "var(--unit-a)",
  II: "var(--unit-b)",
  III: "var(--unit-c)",
  IV: "#3b82f6",
  V: "#ec4899",
};

export default function AiCheatPage() {
  const [activeUnitNum, setActiveUnitNum] = useState<"I" | "II" | "III" | "IV" | "V">("I");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("full");
  const [tierFilter, setTierFilter] = useState<"ALL" | "CORE" | "EXTENDED" | "SUPPORTING">("ALL");
  const [q, setQ] = useState("");
  const [revisedSet, setRevisedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem("revised_ai_topics");
      if (saved) setRevisedSet(new Set(JSON.parse(saved)));
    } catch (e) {}
  }, []);

  const toggleRevised = (id: string) => {
    setRevisedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem("revised_ai_topics", JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  };

  const currentUnit = AI_UNITS[activeUnitNum];

  const unitTopics = useMemo(() => {
    let list = ALL_AI_TOPICS.filter((t) => (t.unitNumber || t.unit) === activeUnitNum);
    if (tierFilter !== "ALL") {
      list = list.filter((t) => t.tier === tierFilter);
    }
    return list;
  }, [activeUnitNum, tierFilter]);

  const searchResults = useMemo(() => {
    if (!q.trim()) return [];
    const query = q.toLowerCase();
    return ALL_AI_TOPICS.filter((t) =>
      [t.title, t.definition, t.oneLineIdea, t.complexity?.time, ...(t.keywords ?? []), ...t.examPoints]
        .join(" ")
        .toLowerCase()
        .includes(query)
    ).slice(0, 8);
  }, [q]);

  const coreCount = ALL_AI_TOPICS.filter((t) => (t.unitNumber || t.unit) === activeUnitNum && t.tier === "CORE").length;
  const extCount = ALL_AI_TOPICS.filter((t) => (t.unitNumber || t.unit) === activeUnitNum && t.tier !== "CORE").length;


  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 text-[var(--text-primary)]">
      <StudyHeader title="AI Cheat Sheets" />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <Link href="/study/ai" className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> AI Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            🧠 Visual Knowledge Engine
          </h1>
          <p className="text-xs text-[var(--text-muted)] pt-0.5">
            Units I–V • Exam cheat sheets, active recall self-tests & interactive steppers.
          </p>
        </div>

        {/* Display Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-bold">
          <button
            onClick={() => setDisplayMode("full")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              displayMode === "full" ? "bg-[var(--action-primary)] text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Full Notes
          </button>
          <button
            onClick={() => setDisplayMode("revision")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              displayMode === "revision" ? "bg-[var(--action-primary)] text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> ⚡ Revision
          </button>
          <button
            onClick={() => setDisplayMode("recall")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              displayMode === "recall" ? "bg-[var(--action-primary)] text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> 🧠 Self-Test
          </button>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search A*, Bayes, Decision Tree, O(b^d), CSP, FOL..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none"
        />
        {searchResults.length > 0 && (
          <div className="absolute z-20 mt-2 w-full rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl overflow-hidden divide-y divide-[var(--border)]">
            {searchResults.map((r) => (
              <Link
                key={r.id}
                href={`/study/ai/topic/${r.id}`}
                onClick={() => setQ("")}
                className="block px-4 py-3 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--action-primary)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--text-primary)]">{r.title}</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)]">
                    Unit {r.unitNumber || r.unit} • {r.tier}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5">{r.oneLineIdea || r.definition}</p>
              </Link>
            ))}
          </div>
        )}
      </div>


      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar */}
        <div className="lg:col-span-3">
          <StudySidebar
            units={AI_UNITS}
            allTopics={ALL_AI_TOPICS}
            activeUnitNumber={activeUnitNum}
            onSelectUnit={(num) => setActiveUnitNum(num as any)}
            revisedTopicIds={revisedSet}
            accentMap={UNIT_ACCENTS}
          />
        </div>

        {/* Center Content Stream */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-[var(--text-primary)]">{currentUnit.title}</h2>
                <p className="text-xs text-[var(--text-muted)]">{currentUnit.subtitle}</p>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  🎯 {coreCount} Core
                </span>
                {extCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    📚 {extCount} Extended
                  </span>
                )}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)] text-xs font-semibold">
              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Filter:</span>
              <button
                onClick={() => setTierFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  tierFilter === "ALL" ? "bg-[var(--action-primary)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                All ({ALL_AI_TOPICS.filter((t) => (t.unitNumber || t.unit) === activeUnitNum).length})
              </button>
              <button
                onClick={() => setTierFilter("CORE")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  tierFilter === "CORE" ? "bg-emerald-500 text-white font-bold" : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-emerald-400"
                }`}
              >
                🎯 Core ({coreCount})
              </button>
              {extCount > 0 && (
                <button
                  onClick={() => setTierFilter("EXTENDED")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    tierFilter === "EXTENDED" ? "bg-purple-500 text-white font-bold" : "bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-purple-400"
                  }`}
                >
                  📚 Extended ({extCount})
                </button>
              )}
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-4">
            {unitTopics.map((topic) => (
              <StudyCard
                key={topic.id}
                topic={topic}
                mode={displayMode}
                accentColor={UNIT_ACCENTS[topic.unitNumber || topic.unit || "I"]}
                onToggleRevised={toggleRevised}
                isRevised={revisedSet.has(topic.id)}
              />
            ))}
          </div>
        </div>

        {/* Right Sidebar TOC */}
        <div className="hidden lg:block lg:col-span-3 sticky top-6">
          <StudyTOC topic={unitTopics[0]} siblings={unitTopics.slice(1)} />
        </div>
      </div>
    </div>
  );
}
