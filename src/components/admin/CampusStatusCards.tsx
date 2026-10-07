import { Activity, GraduationCap, UserCheck, Briefcase, HardHat, Users } from "lucide-react";
import Link from "next/link";
import type { PersonTypeStats } from "@/lib/types";

interface CampusStatusCardsProps {
  studentStats: PersonTypeStats;
  facultyStats: PersonTypeStats;
  staffStats: PersonTypeStats;
  workerStats: PersonTypeStats;
  visitorStats: PersonTypeStats;
  todayIn: number;
  todayOut: number;
  totalScans: number;
}

export function CampusStatusCards({ studentStats, facultyStats, staffStats, workerStats, visitorStats, todayIn, todayOut, totalScans }: CampusStatusCardsProps) {
  const facultyRate = facultyStats.total > 0
    ? Math.round((facultyStats.onCampus / facultyStats.total) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          🏫 Campus Occupancy Overview
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link href="/admin/students" className="block p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 hover:bg-blue-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-blue-400/80 group-hover:text-blue-400 transition-colors">
            <GraduationCap className="w-3 h-3" /> <span className="sm:inline hidden">Students</span><span className="sm:hidden">📚</span>
          </div>
          <div className="text-xl font-black text-blue-400 mt-0.5">{studentStats.onCampus.toLocaleString()}</div>
          <div className="text-[9px] text-[var(--text-muted)] mt-0.5 hidden sm:block">
            <span className="text-emerald-400">{studentStats.inToday} in</span>
            <span className="mx-0.5">·</span>
            <span className="text-amber-400">{studentStats.outToday} out</span>
          </div>
        </Link>
        <Link href="/admin/faculty" className="block p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 hover:bg-emerald-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400/80 group-hover:text-emerald-400 transition-colors">
            <UserCheck className="w-3 h-3" /> <span className="sm:inline hidden">Faculty</span><span className="sm:hidden">👨‍🏫</span>
          </div>
          <div className="text-xl font-black text-emerald-400 mt-0.5">{facultyStats.onCampus.toLocaleString()}</div>
          <div className="text-[9px] text-[var(--text-muted)] mt-0.5 hidden sm:block">{facultyRate}% attendance · {facultyStats.inToday} in today</div>
        </Link>
        <Link href="/admin/staff" className="block p-3 rounded-xl bg-purple-500/5 border border-purple-500/15 hover:bg-purple-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-purple-400/80 group-hover:text-purple-400 transition-colors">
            <Briefcase className="w-3 h-3" /> <span className="sm:inline hidden">Staff</span><span className="sm:hidden">💼</span>
          </div>
          <div className="text-xl font-black text-purple-400 mt-0.5">{staffStats.onCampus.toLocaleString()}</div>
          <div className="text-[9px] text-[var(--text-muted)] mt-0.5 hidden sm:block">{staffStats.inToday} entries today</div>
        </Link>
        <Link href="/admin/workers" className="block p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-400/80 group-hover:text-amber-400 transition-colors">
            <HardHat className="w-3 h-3" /> <span className="sm:inline hidden">Workers</span><span className="sm:hidden">🔧</span>
          </div>
          <div className="text-xl font-black text-amber-400 mt-0.5">{workerStats.onCampus.toLocaleString()}</div>
          <div className="text-[9px] text-[var(--text-muted)] mt-0.5 hidden sm:block">{workerStats.inToday} entries today</div>
        </Link>
        <Link href="/admin/students" className="block p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15 hover:bg-cyan-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-cyan-400/80 group-hover:text-cyan-400 transition-colors">
            <Users className="w-3 h-3" /> <span className="sm:inline hidden">Visitors</span><span className="sm:hidden">👤</span>
          </div>
          <div className="text-xl font-black text-cyan-400 mt-0.5">{visitorStats.onCampus.toLocaleString()}</div>
          <div className="text-[9px] text-[var(--text-muted)] mt-0.5 hidden sm:block">on campus now</div>
        </Link>
        <Link href="/admin/reports" className="block p-3 rounded-xl bg-slate-500/5 border border-slate-500/15 hover:bg-slate-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400/80 group-hover:text-slate-400 transition-colors">
            <Activity className="w-3 h-3" /> <span className="sm:inline hidden">Total Today</span><span className="sm:hidden">📊</span>
          </div>
          <div className="text-xl font-black text-slate-300 mt-0.5">{totalScans.toLocaleString()}</div>
          <div className="text-[9px] text-[var(--text-muted)] mt-0.5 hidden sm:block">
            <span className="text-emerald-400">{todayIn} in</span>
            <span className="mx-0.5">·</span>
            <span className="text-amber-400">{todayOut} out</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
