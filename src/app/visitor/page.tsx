"use client";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import {
  Inbox,
  Clock,
  Loader2,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Building2,
  FileText,
  CheckCircle2,
  Wrench,
} from "lucide-react";

/* response shapes */

interface DataResponse {
  success: boolean;
  data: unknown;
  total?: number;
}

interface VisitorSummary {
  active?: string;
  logs?: unknown[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = "text-white",
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 text-slate-400 min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide truncate">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500 min-w-0">{sub}</p>}
    </div>
  );
}

function SectionLink({
  href,
  title,
  sub,
}: {
  href: string;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0 hover:bg-slate-800/50 transition-colors"
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </Link>
  );
}

/* main content */

function VisitorInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "visitor") as Role;
  const tier = getRoleTier(role);

  const {
    data: mine,
    loading: mineLoading,
    error: mineError,
    refresh: refreshMine,
  } = useApiResource<DataResponse>("/api/visitors/mine", { ttlMs: 30_000 });
  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshMine()
    ]);
  }, [refreshMine]);
  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });
  const busy = mineLoading && !mine;
  const summary = ((mine as { data?: VisitorSummary } | null)?.data) as VisitorSummary | undefined;
  const passStatus = summary?.active ? "ACTIVE" : "—";
  const logCount = summary?.logs?.length ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* KPI row */}
      <WidgetBoundary title="Visitor Portal">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard icon={UserCheck} label="My Pass Status" value={passStatus} sub="Current visitor pass status" accent="text-emerald-400" loading={mineLoading && !mine} />
          <StatCard icon={Inbox} label="My Visit Logs" value={logCount} sub="Total visit history" accent="text-sky-400" loading={mineLoading && !mine} />
          <StatCard icon={FileText} label="Check-in Time" value="—" sub="Last check-in time" accent="text-amber-400" loading={mineLoading && !mine} />
          <StatCard icon={ShieldCheck} label="Campus Rules" value="Required" sub="Accompany your host on premises" accent="text-white" loading={false} />
        </div>
      </WidgetBoundary>

      {/* Section quick-links */}
      <WidgetBoundary title="Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          <SectionLink href="/visitor/registration" title="Registration" sub="Visitor registration and pass details" />
          <SectionLink href="/visitor/request" title="Request" sub="Extend or modify your visit request" />
          <SectionLink href="/visitor/host-info" title="Host Info" sub="Your host's details and contact" />
          <SectionLink href="/visitor/approval-status" title="Approval Status" sub="Current approval status of your pass" />
          <SectionLink href="/visitor/visit-details" title="Visit Details" sub="Purpose, duration and gate info" />
          <SectionLink href="/visitor/checkin-out" title="Check-in / Out" sub="Scan your pass at any gate" />
          <SectionLink href="/visitor/history" title="History" sub="Past visit records" />
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function VisitorPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VisitorInner />
    </Suspense>
  );
}
