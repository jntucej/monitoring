"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { DigitalIdCard } from "@/components/student/DigitalIdCard";
import { ActivePasses } from "@/components/student/ActivePasses";
import { RecentActivity } from "@/components/student/RecentActivity";
import { UserProfileTab } from "@/components/shared/UserProfileTab";
import { QrCode, FileCheck, Clock, User, ShieldCheck, TrendingUp, AlertTriangle, Send, Calendar } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

export default function StudentDashboardPage() {
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab") || "idcard";

  const [studentStats, setStudentStats] = useState({
    curfewScore: 98,
    monthlyOutings: 12,
    activePassesCount: 1,
    lastGateTime: "Today, 08:30 AM",
  });

  useEffect(() => {
    const fetchStudentStats = async () => {
      try {
        const authRaw = typeof window !== "undefined" ? localStorage.getItem("gate-monitor-auth") : null;
        const auth = authRaw ? JSON.parse(authRaw) : null;
        const roll = auth?.state?.user?.uniqueId ?? auth?.state?.user?.roll ?? auth?.user?.uniqueId ?? auth?.user?.roll;
        if (!roll) return;

        const res = await fetch(`/api/students/${roll}/history`, { headers: getAuthHeaders(), cache: "no-store" });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const scans = json.data;
          const monthly = scans.filter((s: any) => {
            const scanDate = new Date(s.timestamp || s.scanned_at);
            const now = new Date();
            return scanDate.getMonth() === now.getMonth() && scanDate.getFullYear() === now.getFullYear();
          }).length;

          setStudentStats((prev) => ({
            ...prev,
            monthlyOutings: monthly || prev.monthlyOutings,
            lastGateTime: scans[0] ? new Date(scans[0].timestamp || scans[0].scanned_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : prev.lastGateTime,
          }));
        }
      } catch {
        // defaults
      }
    };

    fetchStudentStats();
  }, []);

  const renderActiveView = () => {
    switch (currentTab) {
      case "passes":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="w-5 h-5 text-[var(--action-primary)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Gate Pass Requests</h2>
            </div>
            <ActivePasses />
          </div>
        );
      case "history":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-[var(--action-primary)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Personal Entrance History</h2>
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
                    <div className="text-xs font-bold text-slate-100">Request Local Pass</div>
                    <div className="text-[10px] text-slate-400">Day outing up to 21:00</div>
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
                    <div className="text-xs font-bold text-slate-100">Outstation Leave</div>
                    <div className="text-[10px] text-slate-400">Multi-day home permissions</div>
                  </div>
                </div>
              </Link>

              <Link
                href="/student/passes?action=emergency"
                className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/15 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 group-hover:scale-105 transition-transform">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100">Emergency Outing</div>
                    <div className="text-[10px] text-slate-400">Immediate warden dispatch</div>
                  </div>
                </div>
              </Link>
            </div>

            {/* Curfew & Movement Analytics Cards (Option B) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border)] space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Curfew Score</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-black text-slate-100">{studentStats.curfewScore}%</div>
                <div className="text-[10px] text-emerald-400 font-medium">On-Time Return Track</div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border)] space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Outings</span>
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-xl font-black text-slate-100">{studentStats.monthlyOutings}</div>
                <div className="text-[10px] text-slate-400 font-medium">Scans this month</div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border)] space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Passes</span>
                  <FileCheck className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xl font-black text-slate-100">{studentStats.activePassesCount}</div>
                <div className="text-[10px] text-amber-400 font-medium">Ready at turnstile</div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border)] space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Gate Scan</span>
                  <Clock className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-xs font-bold text-slate-100 truncate">{studentStats.lastGateTime}</div>
                <div className="text-[10px] text-sky-400 font-medium">Verified Server Log</div>
              </div>
            </div>

            {/* Option A — Digital ID Card */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <QrCode className="w-5 h-5 text-[var(--action-primary)]" />
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Digital Campus ID Card</h2>
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
          {currentTab === "idcard" && "Student Hub"}
          {currentTab === "passes" && "Gate Passes Desk"}
          {currentTab === "history" && "Activity History"}
          {currentTab === "profile" && "Account Center"}
        </h1>
        <p className="text-xs text-[var(--text-muted)]">
          {currentTab === "idcard" && "Your permanent digital identity card & boarding passes"}
          {currentTab === "passes" && "Track permissions, request leaves, and review warden status"}
          {currentTab === "history" && "Complete audit trail of your entries and exits"}
          {currentTab === "profile" && "Manage theme settings, local details, and credentials"}
        </p>
      </div>

      <main className="min-h-[50vh] flex flex-col justify-start">
        {renderActiveView()}
      </main>
    </div>
  );
}
