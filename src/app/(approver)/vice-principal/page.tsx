"use client";

import { Suspense, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Loader2,
  Clock,
  ArrowRight,
  Inbox,
  AlertTriangle,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useProbe } from "./_probe";

/* ── response shapes ── */

interface PermissionRequestRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  student?: {
    name: string;
    student_details?: { roll?: string } | null;
  } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequestRow[];
  total?: number;
}

interface PresenceMatrixData {
  gates: Array<{ id: string; name: string; code: string }>;
  roles: string[];
  matrix: Record<string, Record<string, number>>;
  lastUpdated: string;
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
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500 min-w-0">{sub}</p>}
    </div>
  );
}

function VicePrincipalDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "vice_principal") as Role;
  const tier = getRoleTier(role);

  const {
    data: vpQueue,
    loading: queueLoading,
    error: queueError,
    refresh: refreshQueue,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?status=PENDING&stage=vice_principal",
    { ttlMs: 30_000 }
  );

  const { data: matrix } = useApiResource<{ success: boolean; data: PresenceMatrixData }>(
    "/api/occupancy/presence-matrix",
    { ttlMs: 30_000 }
  );

  const alertsProbe = useProbe<{ data?: unknown; total?: number }>("/api/alerts?resolved=false", 30_000);

  const rows = vpQueue?.data ?? [];
  const total = vpQueue?.total ?? rows.length;
  const slaBreached = rows.filter((r) => {
    if (!r.sla_deadline) return false;
    const ts = new Date(r.sla_deadline).getTime();
    return !Number.isNaN(ts) && ts < Date.now();
  }).length;

  const { onCampus } = useMemo(() => {
    const gates = matrix?.data?.gates ?? [];
    const m = matrix?.data?.matrix ?? {};
    const rolesList = matrix?.data?.roles ?? [];
    const gateTotals = gates.map((g) => ({
      ...g,
      total: rolesList.reduce((sum, r) => sum + (m[g.id]?.[r] ?? 0), 0),
    }));
    return { onCampus: gateTotals.reduce((sum, g) => sum + g.total, 0) };
  }, [matrix]);

  const alertsRestricted = alertsProbe.restricted;
  const alertsCount =
    alertsProbe.data?.total != null
      ? alertsProbe.data.total
      : Array.isArray(alertsProbe.data?.data)
        ? (alertsProbe.data?.data as unknown[]).length
        : 0;

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([
      refreshQueue(),
      new Promise<void>((resolve) => {
        const handler = () => resolve();
        window.addEventListener("vp-probe-refresh", handler, { once: true });
        window.dispatchEvent(new Event("vp-probe-refresh"));
      }),
    ]);
  }, [refreshQueue]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const anyLoading = (queueLoading && !vpQueue) || alertsProbe.loading;

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
          disabled={queueLoading || alertsProbe.loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {queueLoading || alertsProbe.loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {queueLoading || alertsProbe.loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {queueError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Escalation queue loading failed: {queueError}</span>
          </span>
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <WidgetBoundary title="Executive Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
          <StatCard
            icon={Inbox}
            label="VP Pending"
            value={vpQueue ? total : "…"}
            sub="Requests at the Vice Principal stage"
            accent="text-sky-400"
            loading={queueLoading && !vpQueue}
          />
          <StatCard
            icon={AlertTriangle}
            label="SLA Breached"
            value={vpQueue ? slaBreached : "…"}
            sub="VP queue past deadline"
            accent="text-amber-400"
            loading={queueLoading && !vpQueue}
          />
          <StatCard
            icon={CheckCircle2}
            label="Active Alerts"
            value={alertsRestricted ? "Restricted" : alertsCount}
            sub={alertsRestricted ? "Restricted at this tier" : "Unresolved campus alerts"}
            accent={alertsRestricted ? "text-slate-500" : alertsCount > 0 ? "text-rose-400" : "text-emerald-400"}
            loading={alertsProbe.loading}
          />
          <StatCard
            icon={MapPin}
            label="On Campus"
            value={matrix ? onCampus : "…"}
            sub="Across all active gates"
            accent="text-emerald-400"
            loading={!matrix}
          />
        </div>
      </WidgetBoundary>

      {/* Section quick links */}
      <WidgetBoundary title="Desk Sections">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
          {[
            { href: "/vice-principal/analytics", label: "Academic Analytics", sub: "Department summary" },
            { href: "/vice-principal/attendance", label: "Attendance Exceptions", sub: "Staff attendance detail" },
            { href: "/vice-principal/gates", label: "Gate Summary", sub: "Per-gate presence" },
            { href: "/vice-principal/approvals", label: "Approvals", sub: "VP-stage queue" },
            { href: "/vice-principal/reports", label: "Reports", sub: "Staff & operational" },
            { href: "/vice-principal/tasks", label: "Tasks", sub: "Delegated items" },
          ].map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-xl border border-slate-800 bg-[#111827] p-3 flex items-center justify-between gap-2 hover:border-slate-600 transition-colors min-w-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{s.label}</p>
                <p className="text-xs text-slate-500 min-w-0">{s.sub}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
            </Link>
          ))}
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function VicePrincipalDashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VicePrincipalDashboardInner />
    </Suspense>
  );
}
