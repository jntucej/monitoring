"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import Link from "next/link";
import { PDC_TOPIC_MAP, PDC_UNITS, ALL_PDC_TOPICS } from "../../data";
import { PdcCheatCard } from "../../components/PdcCheatCard";
import { ArrowLeft } from "lucide-react";

export default function PdcTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const topic = PDC_TOPIC_MAP[id];
  if (!topic) return notFound();

  const unit = PDC_UNITS[topic.unit];
  const siblings = ALL_PDC_TOPICS.filter((t) => t.unit === topic.unit && t.id !== topic.id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/study/pdc/cheat`} className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Cheat Sheets
        </Link>
        <span className="text-[10px] font-semibold text-[var(--text-muted)]">{unit.title}</span>
      </div>
      <PdcCheatCard topic={topic} />

      {siblings.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">Related in this unit</p>
          <div className="flex flex-wrap gap-2">
            {siblings.map((t) => (
              <Link key={t.id} href={`/study/pdc/topic/${t.id}`} className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--action-primary)]">
                {t.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}