"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { DigitalIdCard } from "@/components/student/DigitalIdCard";
import { StudentDashboardWidgets } from "@/components/student/widgets";
import { ActivePasses } from "@/components/student/ActivePasses";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { RecentActivity } from "@/components/student/RecentActivity";
import { UserProfileTab } from "@/components/shared/UserProfileTab";
import { QrCode, FileCheck, Clock, User, ShieldCheck, TrendingUp, AlertTriangle, Send, Calendar, Loader2 } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

function StudentDashboardInner() {
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab") || "idcard";

  const [studentStats, setStudentStats] = useState<{
    monthlyOutings: number;
    lastGateTime: string;
  } | null>(null);
  const [statsError, setStatsError] = useState(false);

  const fetchStudentStats = () => {
    setStatsError(false);
    setStudentStats(null);
    (async () => {
      try {
        const authRaw = sessionStorage.getItem("gate-monitor-auth");
        const auth = authRaw ? JSON.parse(authRaw) : null;
        const roll = auth?.state?.user?.uniqueId ?? auth?.state?.user?.roll ?? auth?.user?.uniqueId ?? auth?.user?.roll;
        if (!roll) {
          setStatsError(true);
          return;
        }

        const res = await fetch(`/api/persons/${encodeURIComponent(roll)}/history`, {
          headers: getAuthHeaders(),
          cache: "no-store",
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.history)) {
          const scans = json.data.history;
          const monthly = scans.filter((s: any) => {
            const scanDate = new Date(s.timestamp || s.scanned_at);
            const now = new Date();
            return scanDate.getMonth() === now.getMonth() && scanDate.getFullYear() === now.getFullYear();
          }).length;

          setStudentStats({
            monthlyOutings: monthly,
            lastGateTime: scans[0] ? new Date(scans[0].timestamp || scans[0].scanned_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "—",
          });
        } else {
          setStatsError(true);
        }
      } catch {
        setStatsError(true);
      }
    })();
  };

  useEffect(() => {
    fetchStudentStats();
  }, []);

  const renderActiveView = () => {
    switch (currentTab) {
      case "passes":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="w-5 h-5 text-[var(--action-primary)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]"><span className="sm:hidden">📋</span><span className="hidden sm:inline">📋 Gate Pass Requests</span></h2>
            </div>
            <ActivePasses />
          </div>
        );
      case "history":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-[var(--action-primary)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]"><span className="sm:hidden">🕐</span><span className="hidden sm:inline">🕐 Personal Entrance History</span></h2>
            </div>
            <RecentActivity />
          </div>
        );
      case "profile":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-2 justify-center">
              <User className="w-5 h-5 text-[var(--action-primary)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Your Student Profile</h2>
            </div>
            <UserProfileTab />
          </div>
        );
      case "idcard":
      default:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Quick Actions & Pass Request Bar (Option A) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href="/student/passes?action=new"
                className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Request Local Pass</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Day outing up to 21:00</div>
                  </div>
                </div>
              </Link>

              <Link
                href="/student/passes?action=new_leave"
                className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Outstation Leave</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Multi-day home permissions</div>
                  </div>
                </div>
              </Link>

              <Link
                href="/student/passes?action=new"
                className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Daily Outing</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Short outing (2-4 hrs)</div>
                  </div>
                </div>
              </Link>
            </div>

            {/* Curfew & Movement Analytics Cards (Option B) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {statsError ? (
                <div className="sm:col-span-4 flex items-center justify-between gap-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                  <div className="flex items-center gap-2 text-xs text-rose-300 font-medium">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Could not load stats. Gateway telemetry unavailable.</span>
                  </div>
                  <button
                    onClick={fetchStudentStats}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-bold hover:bg-rose-500/30 transition"
                  >
                    Retry
                  </button>
                </div>
              ) : studentStats === null ? (
                <div className="sm:col-span-4 flex items-center justify-center gap-2 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--action-info)]" />
                  Loading your stats…
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]"><span className="sm:hidden">📊</span><span className="hidden sm:inline">📊 Monthly Outings</span></span>
                      <TrendingUp className="w-4 h-4 text-[var(--action-info)]" />
                    </div>
                    <div className="text-xl font-black text-[var(--text-primary)]">{studentStats.monthlyOutings}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-medium">Scans this month</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]"><span className="sm:hidden">⏱</span><span className="hidden sm:inline">⏱ Last Gate Scan</span></span>
                      <Clock className="w-4 h-4 text-[var(--action-info)]" />
                    </div>
                    <div className="text-xs font-bold text-[var(--text-primary)] truncate">{studentStats.lastGateTime}</div>
                    <div className="text-[10px] text-[var(--action-info)] font-medium">Verified Server Log</div>
                  </div>
                </>
              )}
            </div>

            {/* Student Overview Widgets */}
            <section aria-label="Student overview" className="mt-6">
              <StudentDashboardWidgets />
            </section>


            {/* Option A — Digital ID Card */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <QrCode className="w-5 h-5 text-[var(--action-primary)]" />
                <h2 className="text-lg font-bold text-[var(--text-primary)]"><span className="sm:hidden">🪪</span><span className="hidden sm:inline">🪪 Digital Campus ID Card</span></h2>
              </div>
              <div className="max-w-md mx-auto sm:max-w-none">
                <DigitalIdCard />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Dynamic Tab Heading */}
      <div className="text-center sm:text-left border-b border-[var(--border)] pb-4 space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
          {currentTab === "idcard" && <><span className="sm:hidden">🪪</span><span className="hidden sm:inline">🪪 Student Hub</span></>}
          {currentTab === "passes" && <><span className="sm:hidden">📋</span><span className="hidden sm:inline">📋 Gate Passes Desk</span></>}
          {currentTab === "history" && <><span className="sm:hidden">🕐</span><span className="hidden sm:inline">🕐 Activity History</span></>}
          {currentTab === "profile" && <><span className="sm:hidden">👤</span><span className="hidden sm:inline">👤 Account Center</span></>}
        </h1>
        <p className="text-xs text-[var(--text-muted)] hidden sm:block">
          {currentTab === "idcard" && "Your permanent digital identity card & boarding passes"}
          {currentTab === "passes" && "Track permissions, request leaves, and review warden status"}
          {currentTab === "history" && "Complete audit trail of your entries and exits"}
          {currentTab === "profile" && "Manage theme settings, local details, and credentials"}
        </p>
      </div>

      <main className="min-h-[50vh] flex flex-col justify-start">
        {renderActiveView()}
        <div className="mt-6">
          <DevContactStrip />
        </div>
      </main>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--text-muted)]">Loading…</div>}>
      <StudentDashboardInner />
    </Suspense>
  );
}
