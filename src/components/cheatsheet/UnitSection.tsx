"use client";

import React from 'react';
import { Unit } from '@/types/cheatsheet';

export const UnitSection = ({ unit, globalCompactMode }: { unit: Unit; globalCompactMode: boolean }) => {
  return (
    <div id={unit.id} className="mb-12">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{unit.title}</h2>
        <p className="text-sm text-slate-500">{unit.overview}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {unit.topics.flatMap(topic => topic.subtopics).flatMap(subtopic => subtopic.concepts).map((concept: any) => (
          <div key={concept.id} className="p-4 border rounded shadow-sm text-slate-500">
            {concept.title} (Module removed)
          </div>
        ))}
      </div>
    </div>
  );
};