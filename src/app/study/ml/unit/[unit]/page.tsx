"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { use } from "react";
import { UNITS, getTopic, topicsForUnit } from "../../../_ml";
import { ArrowLeft, FolderTree } from "lucide-react";

export default function MlUnitPage({ params }: { params: Promise<{ unit: string }> }) {
  const { unit: unitId } = use(params);
  const unit = UNITS[unitId.toUpperCase()];
  if (!unit) return notFound();
      const unitTopics = topicsForUnit(unitId.toUpperCase());

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <Link href="/study/ml" className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Knowledge System
      </Link>
      <header>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--action-primary)]">Unit {unit.id}</p>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{unit.title}</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">{unit.description}</p>
      </header>

      {unit.structure.map((section) => (
        <section key={section.category} className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
            <FolderTree className="w-3.5 h-3.5" /> {section.category}
          </h2>
          <div className="space-y-2">
            {section.topics.map((id) => {
              const t = getTopic(id);
              if (!t) return null;
              return (
                <Link key={id} href={`/study/ml/topic/${id}`} className="glass-card flex items-center justify-between gap-3 rounded-xl px-4 py-3 group">
                  <span className="text-xs font-medium text-[var(--text-primary)]">{t.title}</span>
                  <span className="text-[10px] font-semibold text-[var(--action-primary)] group-hover:translate-x-0.5 transition-transform">→</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}