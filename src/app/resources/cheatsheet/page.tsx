import React from 'react';
import Link from 'next/link';
import { BookOpen, Zap, Server, Network, BrainCircuit } from 'lucide-react';

const subjects = [
  { id: 'atcd', name: 'Automata Theory & Compiler Design', code: 'IT501PC', icon: <BookOpen className="text-blue-500" size={24} /> },
  { id: 'dccn', name: 'Data Communications & Computer Networks', code: 'IT502PC', icon: <Network className="text-emerald-500" size={24} /> },
  { id: 'aca', name: 'Advanced Computer Architecture', code: 'IT511PE', icon: <Server className="text-orange-500" size={24} /> },
  { id: 'ai', name: 'Artificial Intelligence', code: 'IT522PE', icon: <BrainCircuit className="text-purple-500" size={24} /> }
];

export default function CheatSheetIndex() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Zap className="text-blue-600 dark:text-blue-400" size={32} />
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Master Exam Cheat Sheets</h1>
            <p className="text-sm text-slate-500 font-medium tracking-widest uppercase mt-1">High Density Rapid Revision System</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.map(sub => (
            <Link key={sub.id} href={`/resources/cheatsheet/\${sub.id}`} className="block group">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-blue-400 dark:hover:border-blue-700 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl group-hover:scale-110 transition-transform">
                    {sub.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{sub.code}</div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {sub.name}
                    </h2>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
