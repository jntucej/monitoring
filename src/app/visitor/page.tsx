"use client";

import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { DoorOpen, Clock, ShieldCheck, Info } from "lucide-react";

const MIN_TIER = 10; // visitor tier (lowest)

function VisitorDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "visitor") as Role;
  const tier = getRoleTier(role);

  const now = new Date();
  const timeNow = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <DoorOpen className="w-6 h-6 text-emerald-400" />
            Visitor Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · {user?.name || "Campus Visitor"}
          </p>
        </div>
        <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> {timeNow}
        </span>
      </header>

      {/* Role-appropriate info cards — visitors have no backend data access */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Info className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Visit Status</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">CHECKED IN</p>
          <p className="text-xs text-[var(--text-muted)]">Your visitor pass is active for today</p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <DoorOpen className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Check-Out</span>
          </div>
          <p className="text-xl font-bold text-sky-400">On Exit</p>
          <p className="text-xs text-[var(--text-muted)]">Scan your pass at any gate before leaving campus</p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Campus Rules</span>
          </div>
          <p className="text-xl font-bold text-indigo-400">Comply</p>
          <p className="text-xs text-[var(--text-muted)]">Accompany your host while on premises</p>
        </div>
      </div>

      <p className="text-sm text-[var(--text-muted)] leading-relaxed">
        Need to extend your visit or have questions about campus access? Contact the
        gate operator on duty or the campus administration desk.
      </p>

      <DevContactStrip />
    </div>
  );
}

export default function VisitorDashboardPage() {
  return (
    <GuardedPage minTier={MIN_TIER}>
      <Suspense fallback={<PageLoading />}>
        <VisitorDashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
