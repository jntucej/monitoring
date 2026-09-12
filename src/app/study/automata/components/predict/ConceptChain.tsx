"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import type { ConceptChainLink } from "../../data/types";

interface ConceptChainProps {
  links: ConceptChainLink[];
  currentTopicId: string;
}

export function ConceptChain({ links, currentTopicId }: ConceptChainProps) {
  const relevantLinks = links.filter((l) => l.fromTopicId === currentTopicId || l.toTopicId === currentTopicId);
  if (relevantLinks.length === 0) return null;

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
        🔗 Concept Chain Connection
      </p>
      <div className="space-y-1.5">
        {relevantLinks.map((link, idx) => {
          const isFrom = link.fromTopicId === currentTopicId;
          return (
            <div key={idx} className="flex items-center gap-2 text-[10px]">
              <span className={`font-bold ${isFrom ? "text-blue-400" : "text-[var(--text-muted)]"}`}>
                {link.fromTopicId}
              </span>
              <ArrowRight className="w-3 h-3 text-blue-500" />
              <span className={`font-bold ${!isFrom ? "text-blue-400" : "text-[var(--text-muted)]"}`}>
                {link.toTopicId}
              </span>
              <span className="text-[var(--text-muted)] ml-1 italic">{link.relationship}</span>
            </div>
          );
        })}
      </div>
      {relevantLinks.some((l) => l.description) && (
        <p className="text-[9px] text-[var(--text-muted)] italic">
          {relevantLinks.find((l) => l.description)?.description}
        </p>
      )}
    </div>
  );
}