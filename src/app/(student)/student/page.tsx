"use client";

import React, { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { DigitalIdCard } from "@/components/student/DigitalIdCard";
import { StudentDashboardWidgets } from "@/components/student/widgets";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { CampusFeed } from "@/components/engagement/CampusFeed";
import { EventsPanel } from "@/components/engagement/EventsPanel";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { Achievements } from "@/components/engagement/Achievements";
import { PersonalGoals } from "@/components/engagement/PersonalGoals";
import { useAuthStore } from "@/stores/authStore";
import {
  Calendar,
  Clock,
  Loader2,
  Send,
  Sparkles,
  QrCode,
  TrendingUp,
} from "lucide-react";
import { PassQrModal } from "@/components/student/PassQrModal";

type StudentDashboardPayload = {
  curfew: {
    today: { score: number; onTime: number; late: number; violations: number };
    thirtyDayAvg: number;
    trend: "up" | "down" | "flat";
  };
  monthly: { yearMonth: string; total: number };
  activePasses: Array<{ id: string; reason: string; from: string; to: string; qrCode?: string }>;
  lastScan: { direction: "IN" | "OUT"; gateName: string; timestamp: string } | null;
};

type StudentDashboardError =
  | "unknown"
  | "no_roll"
  | "http_401"
  | "http_403"
  | "http_404"
  | "http_429"
  | "http_5xx"
  | "network";

function friendlyDashboardError(code: StudentDashboardError): string {
  switch (code) {
    case "no_roll":
      return "Couldn't identify your student ID. Please re-login to refresh your session.";
    case "http_401":
      return "Session expired. Please re-login to continue.";
    case "http_403":
      return "You don't have permission to view this dashboard.";
    case "http_404":
      return "No dashboard data yet. Check back after your first scan.";
    case "http_429":
      return "Too many requests. Please wait a moment and retry.";
    case "http_5xx":
      return "Server error. Please retry.";
    case "network":
      return "Network error. Check your connection and retry.";
    default:
      return "Could not load dashboard data. Please retry.";
  }
}

function StudentDashboardInner() {
  const authUser = useAuthStore((s) => s.user);
  const [dashboard, setDashboard] = useState<StudentDashboardPayload | null>(null);
  const [dashboardError, setDashboardError] = useState<{ code: StudentDashboardError; message: string } | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [activePass, setActivePass] = useState<StudentDashboardPayload["activePasses"][number] | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const loadDashboard = async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    setDashboard(null);
    setActivePass(null);

    try {
      const res = await fetch("/api/student/dashboard", { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success || !json.data) {
        let code: StudentDashboardError = "unknown";
        if (res.status === 401) code = "http_401";
        else if (res.status === 403) code = "http_403";
        else if (res.status === 404) code = "http_404";
        else if (res.status === 429) code = "http_429";
        else if (res.status >= 500) code = "http_5xx";
        setDashboardError({
          code,
          message: json?.error?.message ?? friendlyDashboardError(code),
        });
        return;
      }

      const data = json.data as StudentDashboardPayload;
      setDashboard(data);

      const now = Date.now();
      const validPass = data.activePasses.find((pass) => new Date(pass.to).getTime() >= now) ?? null;
      setActivePass(validPass);
    } catch {
      setDashboardError({ code: "network", message: friendlyDashboardError("network") });
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [authUser?.id]);

  const todayGlance = useMemo(() => {
    if (!dashboard) return null;
    return {
      curfewScore: dashboard.curfew.today.score,
      trend: dashboard.curfew.trend,
      monthlyOutings: dashboard.monthly.total,
      lastScan: dashboard.lastScan,
      activePassCount: dashboard.activePasses.length,
    };
  }, [dashboard]);

  return (
    <div className="space-y-6 pb-12 min-w-0">
      <section aria-label="Student hero" className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-muted)]">Student dashboard</p>
            <h1 className="mt-1 text-lg font-bold text-[var(--text-primary)]">
              {authUser?.name || "Student"}
            </h1>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {authUser?.uniqueId ? `ID ${authUser.uniqueId}` : "Signed in"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/student/id"
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]"
            >
              <QrCode className="h-4 w-4 text-[var(--action-primary)]" />
              Open Digital ID
            </Link>
          </div>
        </div>
      </section>

      {activePass && (
        <section aria-label="Active gate pass" className="rounded-3xl bg-emerald-500/10 border border-emerald-500/30 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-300">Active Approved Gate Pass</p>
                <p className="text-xs text-emerald-400/80">
                  {activePass.reason ? activePass.reason.replace(/_/g, " ") : "Gate Pass"} · Valid until{" "}
                  {new Date(activePass.to).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Show QR at Gate
            </button>
          </div>
        </section>
      )}

      {showQrModal && activePass && (
        <PassQrModal
          isOpen={showQrModal}
          ticketNumber={activePass.id}
          passTitle={`${activePass.reason ? activePass.reason.replace(/_/g, " ") : "Gate"} Pass`}
          fromDate={activePass.from}
          toDate={activePass.to}
          onClose={() => setShowQrModal(false)}
        />
      )}

      <section aria-label="Today glance" className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Today’s Glance</h2>
            <p className="text-xs text-[var(--text-muted)]">Curfew, last movement, and active pass state in one place.</p>
          </div>
          {dashboardLoading && <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />}
        </div>

        {dashboardError ? (
          <div className="mt-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4">
            <p className="text-xs font-semibold text-rose-500">
              {`[${dashboardError.code}] `}{dashboardError.message}
            </p>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="mt-3 rounded-xl bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 text-[11px] font-bold text-rose-300 hover:bg-rose-500/30"
            >
              Retry
            </button>
          </div>
        ) : dashboardLoading ? (
          <div className="mt-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] p-4 text-xs text-[var(--text-muted)]">
            Loading your dashboard...
          </div>
        ) : todayGlance ? (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Curfew Score</p>
              <p className="mt-1 text-2xl font-black text-[var(--text-primary)]">{todayGlance.curfewScore}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Trend: {todayGlance.trend}</p>
            </div>
            <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Last Scan</p>
              <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                {todayGlance.lastScan ? todayGlance.lastScan.direction : "No scan yet"}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {todayGlance.lastScan
                  ? new Date(todayGlance.lastScan.timestamp).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Awaiting first movement"}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Monthly Outings</p>
              <p className="mt-1 text-2xl font-black text-[var(--text-primary)]">{todayGlance.monthlyOutings}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Total this month</p>
            </div>
            <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Active Passes</p>
              <p className="mt-1 text-2xl font-black text-[var(--text-primary)]">{todayGlance.activePassCount}</p>
              <p className="text-[10px] text-[var(--text-muted)]">Approved and valid now</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] p-4 text-xs text-[var(--text-muted)]">
            No dashboard data yet.
          </div>
        )}
      </section>

      <section aria-label="Quick actions" className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/student/permissions/new"
            className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/15 transition-all flex items-center gap-2.5 group"
          >
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">New Pass / Request</div>
              <div className="text-[10px] text-[var(--text-muted)]">Hostel, exam, or memo request</div>
            </div>
          </Link>

          <Link
            href="/student/gate-pass?action=new"
            className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-all flex items-center gap-2.5"
          >
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Local Gate Pass</div>
              <div className="text-[10px] text-[var(--text-muted)]">Day outing up to curfew</div>
            </div>
          </Link>

          <Link
            href="/student/history"
            className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-all flex items-center gap-2.5"
          >
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">Movement Log</div>
              <div className="text-[10px] text-[var(--text-muted)]">Your recent gate history</div>
            </div>
          </Link>
        </div>
      </section>

      <section aria-label="Campus pulse" className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Campus Pulse</h2>
            <p className="text-xs text-[var(--text-muted)]">Announcements and events in one calm feed.</p>
          </div>
          <TrendingUp className="w-4 h-4 text-[var(--action-info)]" />
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CampusFeed limit={8} />
          <EventsPanel limit={4} />
        </div>
      </section>

      <section aria-label="Progress strip" className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Achievements />
          <PersonalGoals />
        </div>
      </section>

      <section aria-label="Recent activity" className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
        <ActivityTimeline limit={8} />
      </section>

      <section aria-label="Student overview widgets" className="space-y-3">
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Status and Pass Widgets</p>
        </div>
        <StudentDashboardWidgets />
      </section>

      <section aria-label="Digital ID card" className="space-y-3">
        <div className="flex items-center gap-2 justify-center sm:justify-start">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Digital Campus ID Card</p>
        </div>
        <div className="max-w-md mx-auto sm:max-w-none">
          <DigitalIdCard />
        </div>
      </section>

      <QuickActions />
      <NotificationCenter />
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
