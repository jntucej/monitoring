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

function HostelManagerInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "hostel_manager") as Role;
  const tier = getRoleTier(role);

  const {
    data: presence,
    loading: presenceLoading,
    error: presenceError,
    refresh: refreshPresence,
  } = useApiResource<DataResponse>("/api/occupancy/presence-matrix", { ttlMs: 30_000 });
  const {
    data: outpass,
    loading: outpassLoading,
    error: outpassError,
    refresh: refreshOutpass,
  } = useApiResource<DataResponse>("/api/permissions?workflowType=outpass&status=PENDING", { ttlMs: 30_000 });
  const {
    data: leaves,
    loading: leavesLoading,
    error: leavesError,
    refresh: refreshLeaves,
  } = useApiResource<DataResponse>("/api/permissions?workflowType=staff_leave&status=PENDING", { ttlMs: 30_000 });
  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshPresence(),
      refreshOutpass(),
      refreshLeaves()
    ]);
  }, [refreshPresence, refreshOutpass, refreshLeaves]);
  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });
  const busy = presenceLoading && !presence || outpassLoading && !outpass || leavesLoading && !leaves;

  const outpassTotal: number = (outpass as { total?: number })?.total ?? 0;
  const leavesTotal: number = (leaves as { total?: number })?.total ?? 0;

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
      <WidgetBoundary title="Hostel Operations Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard icon={UserCheck} label="On Campus Total" value={'live presence matrix'} sub="People inside all active gates" accent="text-sky-400" loading={presenceLoading && !presence} />
          <StatCard icon={Inbox} label="Pending Outpass" value={outpassTotal} sub="Outpass requests awaiting review" accent="text-emerald-400" loading={outpassLoading && !outpass} />
          <StatCard icon={AlertTriangle} label="Pending Staff Leave" value={leavesTotal} sub="Staff-leave requests awaiting review" accent="text-amber-400" loading={leavesLoading && !leaves} />
          <StatCard icon={Building2} label="Active Gates" value="presence matrix live" sub="Gates reporting to presence matrix" accent="text-white" loading={presenceLoading && !presence} />
        </div>
      </WidgetBoundary>

      {/* Section quick-links */}
      <WidgetBoundary title="Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
          <SectionLink href="/hostel-manager/operations" title="Operations" sub="Daily hostel operations overview" />
          <SectionLink href="/hostel-manager/rooms" title="Rooms" sub="Room and bed allocation status" />
          <SectionLink href="/hostel-manager/occupancy" title="Occupancy" sub="Live occupancy by gate" />
          <SectionLink href="/hostel-manager/maintenance" title="Maintenance" sub="Facility and maintenance queue" />
          <SectionLink href="/hostel-manager/housekeeping" title="Housekeeping" sub="Duty rosters and housekeeping schedules" />
          <SectionLink href="/hostel-manager/service-requests" title="Service Requests" sub="Outpass and staff-leave queues" />
          <SectionLink href="/hostel-manager/reports" title="Reports" sub="Hostel resource and inventory reports" />
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function HostelManagerPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <HostelManagerInner />
    </Suspense>
  );
}
