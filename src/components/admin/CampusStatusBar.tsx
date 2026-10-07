import { useEffect, useState } from "react";
import { Activity, GraduationCap, UserCheck, Briefcase, HardHat, Users } from "lucide-react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/utils";

interface CampusStats {
  studentStats: { onCampus: number; inToday: number; outToday: number };
  facultyStats: { onCampus: number; inToday: number; total: number };
  staffStats: { onCampus: number; inToday: number };
  workerStats: { onCampus: number; inToday: number };
  visitorStats: { onCampus: number };
  todayIn: number;
  todayOut: number;
  totalScans: number;
}

export function CampusStatusBar() {
  const [stats, setStats] = useState<CampusStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/admin/dashboard", {
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setStats({
            studentStats: d.personTypeBreakdown?.student || { onCampus: 0, inToday: 0, outToday: 0 },
            facultyStats: d.personTypeBreakdown?.faculty || { onCampus: 0, inToday: 0, total: 0 },
            staffStats: d.personTypeBreakdown?.staff || { onCampus: 0, inToday: 0 },
            workerStats: d.personTypeBreakdown?.worker || { onCampus: 0, inToday: 0 },
            visitorStats: d.personTypeBreakdown?.visitor || { onCampus: 0 },
            todayIn: d.todayIn ?? 0,
            todayOut: d.todayOut ?? 0,
            totalScans: d.totalScans ?? 0,
          });
        }
      } catch (err) {
        console.error("Failed to fetch campus stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading || !stats) return null;

  const { studentStats, facultyStats, staffStats, workerStats, visitorStats, todayIn, todayOut, totalScans } = stats;
  const facultyRate = facultyStats.total > 0
    ? Math.round((facultyStats.onCampus / facultyStats.total) * 100)
    : 0;

  return (
    <div className="bg-[var(--bg-surface)] border-b border-[var(--border)] p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          🏫 Campus Occupancy Overview
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Link href="/admin/students" className="flex flex-col items-center p-2 rounded-lg bg-blue-500/5 border border-blue-500/15 hover:bg-blue-500/10 transition cursor-pointer text-center">
          <GraduationCap className="w-4 h-4 text-blue-400 mb-1" />
          <span className="text-[10px] text-blue-400/80 hidden sm:inline">Students</span><span className="text-base sm:hidden">📚</span>
          <span className="text-lg font-black text-blue-400">{studentStats.onCampus}</span>
          <span className="text-[9px] text-[var(--text-muted)] hidden sm:inline">{studentStats.inToday}in/{studentStats.outToday}out</span>
        </Link>
        <Link href="/admin/faculty" className="flex flex-col items-center p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 hover:bg-emerald-500/10 transition cursor-pointer text-center">
          <UserCheck className="w-4 h-4 text-emerald-400 mb-1" />
          <span className="text-[10px] text-emerald-400/80 hidden sm:inline">Faculty</span><span className="text-base sm:hidden">👨‍🏫</span>
          <span className="text-lg font-black text-emerald-400">{facultyStats.onCampus}</span>
          <span className="text-[9px] text-[var(--text-muted)] hidden sm:inline">{facultyRate}%</span>
        </Link>
        <Link href="/admin/staff" className="flex flex-col items-center p-2 rounded-lg bg-purple-500/5 border border-purple-500/15 hover:bg-purple-500/10 transition cursor-pointer text-center">
          <Briefcase className="w-4 h-4 text-purple-400 mb-1" />
          <span className="text-[10px] text-purple-400/80 hidden sm:inline">Staff</span><span className="text-base sm:hidden">💼</span>
          <span className="text-lg font-black text-purple-400">{staffStats.onCampus}</span>
          <span className="text-[9px] text-[var(--text-muted)] hidden sm:inline">{staffStats.inToday}in</span>
        </Link>
        <Link href="/admin/workers" className="flex flex-col items-center p-2 rounded-lg bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10 transition cursor-pointer text-center">
          <HardHat className="w-4 h-4 text-amber-400 mb-1" />
          <span className="text-[10px] text-amber-400/80 hidden sm:inline">Workers</span><span className="text-base sm:hidden">🔧</span>
          <span className="text-lg font-black text-amber-400">{workerStats.onCampus}</span>
          <span className="text-[9px] text-[var(--text-muted)] hidden sm:inline">{workerStats.inToday}in</span>
        </Link>
        <Link href="/admin/students" className="flex flex-col items-center p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/15 hover:bg-cyan-500/10 transition cursor-pointer text-center">
          <Users className="w-4 h-4 text-cyan-400 mb-1" />
          <span className="text-[10px] text-cyan-400/80 hidden sm:inline">Visitors</span><span className="text-base sm:hidden">👤</span>
          <span className="text-lg font-black text-cyan-400">{visitorStats.onCampus}</span>
          <span className="text-[9px] text-[var(--text-muted)] hidden sm:inline">online</span>
        </Link>
        <Link href="/admin/reports" className="flex flex-col items-center p-2 rounded-lg bg-slate-500/5 border border-slate-500/15 hover:bg-slate-500/10 transition cursor-pointer text-center">
          <Activity className="w-4 h-4 text-slate-400 mb-1" />
          <span className="text-[10px] text-slate-400/80 hidden sm:inline">Today</span><span className="text-base sm:hidden">📊</span>
          <span className="text-lg font-black text-slate-300">{totalScans}</span>
          <span className="text-[9px] text-[var(--text-muted)] hidden sm:inline">{todayIn}in/{todayOut}out</span>
        </Link>
      </div>
    </div>
  );
}

