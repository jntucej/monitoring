"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, GraduationCap, UserCheck, Briefcase, HardHat, Users } from "lucide-react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { usePolling } from "@/hooks/usePolling";

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
  const api = useApi();

  const [stats, setStats] = useState<CampusStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard", {
        headers: api.getHeaders(),
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
  }, [api]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Poll every 60 s so the occupancy tiles stay fresh without hammering the
  // dashboard endpoint. usePolling is visibility-aware (pauses in background tabs).
  usePolling(fetchDashboard, { intervalMs: 60_000 });

  if (loading || !stats) return null;

  const { studentStats, facultyStats, staffStats, workerStats, visitorStats, todayIn, todayOut, totalScans } = stats;
  const facultyRate = facultyStats.total > 0
    ? Math.round((facultyStats.onCampus / facultyStats.total) * 100)
    : 0;

  return (
    <div className="surface-card bg-bg-surface p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
          🏫 Campus Occupancy Overview
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Link href="/admin/students" className="surface-card flex flex-col items-center p-2 bg-blue-500/5 hover:bg-blue-500/10 transition cursor-pointer text-center">
          <GraduationCap className="w-4 h-4 text-action-primary mb-1" />
          <span className="text-xs text-blue-400/80 hidden sm:inline">Students</span><span className="text-base sm:hidden">📚</span>
          <span className="text-lg font-black text-action-primary">{studentStats.onCampus}</span>
          <span className="text-xs text-text-muted hidden sm:inline">{studentStats.inToday}in/{studentStats.outToday}out</span>
        </Link>
        <Link href="/admin/faculty" className="surface-card flex flex-col items-center p-2 bg-emerald-500/5 hover:bg-emerald-500/10 transition cursor-pointer text-center">
          <UserCheck className="w-4 h-4 text-action-success mb-1" />
          <span className="text-xs text-emerald-400/80 hidden sm:inline">Faculty</span><span className="text-base sm:hidden">👨‍🏫</span>
          <span className="text-lg font-black text-action-success">{facultyStats.onCampus}</span>
          <span className="text-xs text-text-muted hidden sm:inline">{facultyRate}%</span>
        </Link>
        <Link href="/admin/staff" className="surface-card flex flex-col items-center p-2 bg-purple-500/5 hover:bg-purple-500/10 transition cursor-pointer text-center">
          <Briefcase className="w-4 h-4 text-unit-c mb-1" />
          <span className="text-xs text-purple-400/80 hidden sm:inline">Staff</span><span className="text-base sm:hidden">💼</span>
          <span className="text-lg font-black text-unit-c">{staffStats.onCampus}</span>
          <span className="text-xs text-text-muted hidden sm:inline">{staffStats.inToday}in</span>
        </Link>
        <Link href="/admin/workers" className="surface-card flex flex-col items-center p-2 bg-amber-500/5 hover:bg-amber-500/10 transition cursor-pointer text-center">
          <HardHat className="w-4 h-4 text-action-warning mb-1" />
          <span className="text-xs text-amber-400/80 hidden sm:inline">Workers</span><span className="text-base sm:hidden">🔧</span>
          <span className="text-lg font-black text-action-warning">{workerStats.onCampus}</span>
          <span className="text-xs text-text-muted hidden sm:inline">{workerStats.inToday}in</span>
        </Link>
        <Link href="/admin/students" className="surface-card flex flex-col items-center p-2 bg-cyan-500/5 hover:bg-cyan-500/10 transition cursor-pointer text-center">
          <Users className="w-4 h-4 text-cyan-400 mb-1" />
          <span className="text-xs text-cyan-400/80 hidden sm:inline">Visitors</span><span className="text-base sm:hidden">👤</span>
          <span className="text-lg font-black text-cyan-400">{visitorStats.onCampus}</span>
          <span className="text-xs text-text-muted hidden sm:inline">online</span>
        </Link>
        <Link href="/admin/reports" className="surface-card flex flex-col items-center p-2 bg-bg-elevated/5 hover:bg-bg-elevated/10 transition cursor-pointer text-center">
          <Activity className="w-4 h-4 text-text-muted mb-1" />
          <span className="text-xs text-text-muted/80 hidden sm:inline">Today</span><span className="text-base sm:hidden">📊</span>
          <span className="text-lg font-black text-text-secondary">{totalScans}</span>
          <span className="text-xs text-text-muted hidden sm:inline">{todayIn}in/{todayOut}out</span>
        </Link>
      </div>
    </div>
  );
}

