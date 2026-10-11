"use client";

import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { ClipboardCheck, ShieldCheck, Users, FileText, AlertTriangle } from "lucide-react";

const MIN_TIER = 50; // exam_superintendent tier

function ExamSuperintendentDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_superintendent") as Role;
  const tier = getRoleTier(role);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-violet-400" />
            Exam Superintendent Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · Examination Oversight
          </p>
        </div>
        <button className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--bg-elevated)]">
          Refresh
        </button>
      </header>

      {/* Role-appropriate infographic cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <ClipboardCheck className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Exam Permissions</span>
          </div>
          <p className="text-xl font-bold text-violet-400">
            <a href="/exam/permissions" className="hover:underline">Open Queue →</a>
          </p>
          <p className="text-xs text-[var(--text-muted)]">Review pending exam clearance requests</p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Integrity Alerts</span>
          </div>
          <p className="text-xl font-bold text-rose-400">Monitoring</p>
          <p className="text-xs text-[var(--text-muted)]">Gate scan anomalies during exam windows surface here</p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Users className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Scope</span>
          </div>
          <p className="text-xl font-bold text-sky-400">{user?.name || "Superintendent"}</p>
          <p className="text-xs text-[var(--text-muted)]">Examination clearance &amp; escalation authority</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-muted)] flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          Exam clearance requests reach this desk after OIE and Vice Principal review.
          Use <a className="text-violet-400 hover:underline" href="/exam/permissions">Examination Permissions</a>{" "}
          to action the queue.
        </p>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function ExamSuperintendentDashboardPage() {
  return (
    <GuardedPage minTier={MIN_TIER}>
      <Suspense fallback={<PageLoading />}>
        <ExamSuperintendentDashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
