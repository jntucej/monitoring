"use client";

import React from 'react';
import { Unit, Concept } from '@/types/cheatsheet';

interface UnitSectionProps {
  unit: Unit;
  globalCompactMode: boolean;
}

export const UnitSection: React.FC<UnitSectionProps> = ({ unit, globalCompactMode }) => {
  return (
    <div id={unit.id} className="mb-12">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{unit.title}</h2>
        <p className="text-sm text-slate-500">{unit.overview}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {unit.topics.flatMap(topic => topic.subtopics).flatMap(subtopic => subtopic.concepts).map((concept: Concept) => (
          <div
            key={concept.id}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">{concept.title}</h3>
              {concept.priority && <span className="text-sm">{concept.priority}</span>}
            </div>
            {concept.definition && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                {concept.definition.text}
              </p>
            )}
            {concept.definition?.keywords && concept.definition.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {concept.definition.keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
