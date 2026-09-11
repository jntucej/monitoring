"use client";

import React, { useState, useMemo } from 'react';
import { Subject } from '@/types/cheatsheet';
import { UnitSection } from './UnitSection';
import { Search, ListFilter, Minimize2, Maximize2, Zap, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CheatSheetApp = ({ subject }: { subject: Subject }) => {
  const [globalCompact, setGlobalCompact] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  const filteredSubject = useMemo(() => {
    if (!searchQuery && !priorityFilter) return subject;
    const query = searchQuery.toLowerCase();
    const filteredUnits = subject.units.map(unit => {
      const filteredTopics = unit.topics.map(topic => {
        const filteredSubtopics = topic.subtopics.map(subtopic => {
          const filteredConcepts = subtopic.concepts.filter(concept => {
            const matchesSearch = !query || concept.title.toLowerCase().includes(query);
            const matchesPriority = !priorityFilter || concept.priority === priorityFilter;
            return matchesSearch && matchesPriority;
          });
          return { ...subtopic, concepts: filteredConcepts };
        }).filter(st => st.concepts.length > 0);
        return { ...topic, subtopics: filteredSubtopics };
      }).filter(t => t.subtopics.length > 0);
      return { ...unit, topics: filteredTopics };
    }).filter(unit => unit.topics.length > 0);
    return { ...subject, units: filteredUnits };
  }, [subject, searchQuery, priorityFilter]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Zap className="text-blue-600 dark:text-blue-400" size={28} />
            <div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">{subject.title}</h1>
              <p className="text-xs text-slate-500 font-medium tracking-widest uppercase">Master Cheat Sheet</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative group w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="Search formulas, concepts..." className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <button onClick={() => setGlobalCompact(!globalCompact)} className="flex-shrink-0 p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-slate-600 dark:text-slate-300">
              {globalCompact ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {filteredSubject.units.map(unit => (
              <UnitSection key={unit.id} unit={unit} globalCompactMode={globalCompact} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
