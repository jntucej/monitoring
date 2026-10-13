"use client";

export const dynamic = "force-dynamic";

import { ChildStatus } from "@/components/parent/ChildStatus";
import { ChildActivity } from "@/components/parent/ChildActivity";
import { ChildWeeklyActivity } from "@/components/parent/ChildWeeklyActivity";
import { RequestPassForm } from "@/components/parent/RequestPassForm";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import type { GatePass, Person } from "@/lib/types";
import {
  Users,
  Ticket,
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface PersonsResponse {
  success: boolean;
  data: Person[];
}

interface PassesResponse {
  success: boolean;
  data: GatePass[];
}

interface KpiCard {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  sub: string;
  accent: string;
  loading: boolean;
}

function useParentKpis() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "";

  const personsRes = useApiResource<PersonsResponse>("/api/persons?parentId=me", {
    ttlMs: 30_000,
    enabled: !!userId,
  });
  const passesRes = useApiResource<PassesResponse>(
    `/api/passes?parentId=${encodeURIComponent(userId)}`,
    { ttlMs: 30_000, enabled: !!userId }
  );

  const refresh = () => Promise.all([personsRes.refresh(), passesRes.refresh()]);
  usePolling(refresh, { intervalMs: 60_000, enabled: !!userId });

  const children = personsRes.data?.data ?? [];
  const passList = passesRes.data?.data ?? [];
  const activePasses = passList.filter(
    (p: GatePass) => p.finalStatus === "APPROVED" || p.finalStatus === "APPROVED_ADMIN"
  );
  const pendingPasses = passList.filter(
    (p: GatePass) => p.finalStatus === "PENDING" || p.finalStatus === "APPROVED_PARENT"
  );
  const present = children.filter((c) => c.checkedInAt && !c.checkedOutAt).length;

  const cards: KpiCard[] = [
    {
      icon: Users,
      label: "Linked Children",
      value: children.length,
      sub: "Students linked to your account",
      accent: "text-emerald-400",
      loading: personsRes.loading && children.length === 0,
    },
    {
      icon: CheckCircle2,
      label: "On Campus",
      value: present,
      sub: "Currently checked in at the gate",
      accent: "text-sky-400",
      loading: personsRes.loading && children.length === 0,
    },
    {
      icon: Ticket,
      label: "Active Passes",
      value: activePasses.length,
      sub: "Approved passes in force",
      accent: "text-emerald-400",
      loading: passesRes.loading && passList.length === 0,
    },
    {
      icon: Clock,
      label: "Pending",
      value: pendingPasses.length,
      sub: "Awaiting approval",
      accent: "text-amber-400",
      loading: passesRes.loading && passList.length === 0,
    },
  ];

  return {
    cards,
    error: personsRes.error || passesRes.error,
    refresh,
    user,
  };
}

export default function ParentDashboardPage() {
  const { cards, error, refresh, user } = useParentKpis();

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
          <span className="sm:hidden">👨‍👩‍👧</span>
          <span className="hidden sm:inline">👨‍👩‍👧 Parent Dashboard</span>
        </p>
        <p className="text-[var(--text-muted)] hidden sm:block">
          Monitor your child&apos;s campus activity
          {user?.name ? ` · signed in as ${user.name}` : ""}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Some panels unavailable: {error}</span>
          </span>
          <button
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/30"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <c.icon className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wide">{c.label}</span>
            </div>
            {c.loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            ) : (
              <p className={`text-2xl font-bold ${c.accent}`}>{c.value}</p>
            )}
            <p className="text-xs text-[var(--text-muted)]">{c.sub}</p>
          </div>
        ))}
      </div>

      <ChildStatus />

      {/* Weekly infographics — only renders when a linked child has activity */}
      <ChildWeeklyActivity />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChildActivity />
        <RequestPassForm />
      </div>

      <DevContactStrip />
    </div>
  );
}
