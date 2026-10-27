"use client";


import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { DigitalIdCard } from "@/components/student/DigitalIdCard";
import { MessFoodPreference } from "@/components/student/MessFoodPreference";
import { StudentDashboardWidgets } from "@/components/student/widgets";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { CampusFeed } from "@/components/engagement/CampusFeed";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { EventsPanel } from "@/components/engagement/EventsPanel";
import { Achievements } from "@/components/engagement/Achievements";
import { PersonalGoals } from "@/components/engagement/PersonalGoals";
import { SemesterRecap } from "@/components/engagement/SemesterRecap";
import { useAuthStore } from "@/stores/authStore";
import { extractStudentRoll, fetchAuthWithFriendlyError } from "@/lib/student-utils";
import {
  Send, Calendar, Clock, Loader2, UtensilsCrossed, TrendingUp, AlertTriangle,
} from "lucide-react";

type StatsErrorCode =
  | "unknown"
  | "no_roll"
  | "http_401"
  | "http_403"
  | "http_404"
  | "http_429"
  | "http_5xx"
  | "network";

function friendlyStatsError(code: StatsErrorCode): string {
  switch (code) {
    case "no_roll":
      return "Couldn't identify your student ID. Please re-login to refresh your session.";
    case "http_401":
      return "Session expired — please re-login to continue.";
    case "http_403":
      return "You don't have permission to view gate stats.";
    case "http_404":
      return "No gate history yet — check back after your first scan.";
    case "http_429":
      return "Too many requests — please wait a moment and retry.";
    case "http_5xx":
      return "Server error — please retry.";
    case "network":
      return "Network error — check your connection and retry.";
    default:
      return "Could not load stats — please retry.";
  }
}

function StudentDashboardInner() {
  const authUser = useAuthStore((s) => s.user);

  const [studentStats, setStudentStats] = useState<{
    monthlyOutings: number;
    lastGateTime: string;
  } | null>(null);
  const [statsError, setStatsError] = useState<{ code: StatsErrorCode; message: string } | null>(null);

  const fetchStudentStats = () => {
    setStatsError(null);
    setStudentStats(null);
    (async () => {
      try {
        const roll = extractStudentRoll(authUser);
        if (!roll) {
          setStatsError({ code: "no_roll", message: friendlyStatsError("no_roll") });
          return;
        }

        const res = await fetchAuthWithFriendlyError(
          `/api/persons/${encodeURIComponent(roll)}/history`,
        );

        if (!res.ok) {
          let code: StatsErrorCode = "unknown";
          if (res.status === 401) code = "http_401";
          else if (res.status === 403) code = "http_403";
          else if (res.status === 404) code = "http_404";
          else if (res.status === 429) code = "http_429";
          else if (res.status && res.status >= 500) code = "http_5xx";
          else if (res.status === null) code = "network";
          setStatsError({ code, message: res.friendly || friendlyStatsError(code) });
          return;
        }

        const json = res.json as { success?: boolean; data?: { history?: any[] } } | null;
        const history = json?.data?.history;
        if (json?.success && Array.isArray(history)) {
          const scans = history;
          const monthly = scans.filter((s: any) => {
            const scanDate = new Date(s.timestamp || s.scanned_at);
            const now = new Date();
            return (
              !Number.isNaN(scanDate.getTime()) &&
              scanDate.getMonth() === now.getMonth() &&
              scanDate.getFullYear() === now.getFullYear()
            );
          }).length;

          setStudentStats({
            monthlyOutings: monthly,
            lastGateTime:
              scans[0]?.timestamp || scans[0]?.scanned_at
                ? new Date(scans[0].timestamp || scans[0].scanned_at).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—",
          });
        } else {
          setStudentStats({ monthlyOutings: 0, lastGateTime: "—" });
        }
      } catch {
        setStatsError({ code: "network", message: friendlyStatsError("network") });
      }
    })();
  };

  useEffect(() => {
    fetchStudentStats();
  }, []);

  return (
    <div className="space-y-6 pb-12 min-w-0">
      {/* Shared + engagement panels */}
      <QuickActions />
      <NotificationCenter />
      <PersonalizedCampusHome />
      <AttentionQueue />
      <ActivityTimeline />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CampusFeed />
        <EventsPanel />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Achievements />
        <PersonalGoals />
      </div>
      <SemesterRecap />
      <TaskContinuity />

      {/* Quick Actions & Pass Request Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/student/gate-pass?action=new"
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
          href="/student/gate-pass?action=new_leave"
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
          href="/student/gate-pass?action=new"
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

      {/* Curfew & Movement Analytics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statsError ? (
          <div className="sm:col-span-4 flex items-center justify-between gap-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30">
            <div className="flex items-center gap-2 text-xs text-rose-300 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{statsError.message}</span>
            </div>
            <button
              type="button"
              onClick={fetchStudentStats}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-bold hover:bg-rose-500/30 transition"
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Monthly Outings
                </span>
                <TrendingUp className="w-4 h-4 text-[var(--action-info)]" />
              </div>
              <div className="text-xl font-black text-[var(--text-primary)]">{studentStats.monthlyOutings}</div>
              <div className="text-[10px] text-[var(--text-muted)] font-medium">Scans this month</div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Last Gate Scan
                </span>
                <Clock className="w-4 h-4 text-[var(--action-info)]" />
              </div>
              <div className="text-xs font-bold text-[var(--text-primary)] truncate">{studentStats.lastGateTime}</div>
              <div className="text-[10px] text-[var(--action-info)] font-medium">Verified Server Log</div>
            </div>
          </>
        )}
      </div>

      {/* Student Overview Widgets */}
      <section aria-label="Student overview" className="mt-2">
        <StudentDashboardWidgets />
      </section>

      {/* Digital ID Card */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Digital Campus ID Card</p>
        </div>
        <div className="max-w-md mx-auto sm:max-w-none">
          <DigitalIdCard />
        </div>
      </div>

      {/* Mess Food Preference */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <UtensilsCrossed className="w-5 h-5 text-[var(--action-primary)]" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Mess Food Preference</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MessFoodPreference />
        </div>
      </div>

      <div className="mt-6">
        <DevContactStrip />
      </div>
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
