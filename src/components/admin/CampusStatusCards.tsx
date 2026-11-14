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
    <div className="surface-card bg-bg-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
          🏫 Campus Occupancy Overview
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Link href="/admin/students" className="surface-card block p-3 bg-blue-500/5 hover:bg-blue-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group">
          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-400/80 group-hover:text-action-primary transition-colors">
            <GraduationCap className="size-3.5" /> <span className="sm:inline hidden">Students</span><span className="sm:hidden">📚</span>
          </div>
          <div className="text-xl font-black text-action-primary mt-0.5">{studentStats.onCampus.toLocaleString()}</div>
          <div className="text-xs text-text-muted mt-0.5 hidden sm:block">
            <span className="text-action-success">{studentStats.inToday} in</span>
            <span className="mx-0.5">·</span>
            <span className="text-action-warning">{studentStats.outToday} out</span>
          </div>
        </Link>
        <Link href="/admin/faculty" className="surface-card block p-3 bg-emerald-500/5 hover:bg-emerald-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group">
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400/80 group-hover:text-action-success transition-colors">
            <UserCheck className="size-3.5" /> <span className="sm:inline hidden">Faculty</span><span className="sm:hidden">👨‍🏫</span>
          </div>
          <div className="text-xl font-black text-action-success mt-0.5">{facultyStats.onCampus.toLocaleString()}</div>
          <div className="text-xs text-text-muted mt-0.5 hidden sm:block">{facultyRate}% attendance · {facultyStats.inToday} in today</div>
        </Link>
        <Link href="/admin/staff" className="surface-card block p-3 bg-purple-500/5 hover:bg-purple-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group">
          <div className="flex items-center gap-1.5 text-xs font-medium text-purple-400/80 group-hover:text-unit-c transition-colors">
            <Briefcase className="size-3.5" /> <span className="sm:inline hidden">Staff</span><span className="sm:hidden">💼</span>
          </div>
          <div className="text-xl font-black text-unit-c mt-0.5">{staffStats.onCampus.toLocaleString()}</div>
          <div className="text-xs text-text-muted mt-0.5 hidden sm:block">{staffStats.inToday} entries today</div>
        </Link>
        <Link href="/admin/workers" className="surface-card block p-3 bg-amber-500/5 hover:bg-amber-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400/80 group-hover:text-action-warning transition-colors">
            <HardHat className="size-3.5" /> <span className="sm:inline hidden">Workers</span><span className="sm:hidden">🔧</span>
          </div>
          <div className="text-xl font-black text-action-warning mt-0.5">{workerStats.onCampus.toLocaleString()}</div>
          <div className="text-xs text-text-muted mt-0.5 hidden sm:block">{workerStats.inToday} entries today</div>
        </Link>
        <Link href="/admin/students" className="surface-card block p-3 bg-cyan-500/5 hover:bg-cyan-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group">
          <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-400/80 group-hover:text-cyan-400 transition-colors">
            <Users className="size-3.5" /> <span className="sm:inline hidden">Visitors</span><span className="sm:hidden">👤</span>
          </div>
          <div className="text-xl font-black text-cyan-400 mt-0.5">{visitorStats.onCampus.toLocaleString()}</div>
          <div className="text-xs text-text-muted mt-0.5 hidden sm:block">on campus now</div>
        </Link>
        <Link href="/admin/reports" className="surface-card block p-3 bg-bg-elevated/5 hover:bg-bg-elevated/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group">
          <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted/80 group-hover:text-text-muted transition-colors">
            <Activity className="size-3.5" /> <span className="sm:inline hidden">Total Today</span><span className="sm:hidden">📊</span>
          </div>
          <div className="text-xl font-black text-text-secondary mt-0.5">{totalScans.toLocaleString()}</div>
          <div className="text-xs text-text-muted mt-0.5 hidden sm:block">
            <span className="text-action-success">{todayIn} in</span>
            <span className="mx-0.5">·</span>
            <span className="text-action-warning">{todayOut} out</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
