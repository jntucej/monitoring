"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { usePolling } from "@/hooks/usePolling";
import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  ArrowLeft,
  Building2,
  Flag,
  ClipboardCheck,
} from "lucide-react";
import {
  fetchJson,
  StatCard,
  HostelOccupancyPanel,
  OutpassLeavePanel,
  OutpassRow,
  PresenceMatrixData,
  HostelOverviewPanel,
} from "../_shared";

function HostelOversightInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const [outpasses, setOutpasses] = useState<OutpassRow[] | null>(null);
  const [leaves, setLeaves] = useState<OutpassRow[] | null>(null);
  const [escalated, setEscalated] = useState<OutpassRow[] | null>(null);
  const [matrix, setMatrix] = useState<PresenceMatrixData | null>(null);
  const [students, setStudents] = useState<unknown[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    const [outR, leaveR, escR, matR, stuR] = await Promise.all([
      fetchJson("/api/permissions?workflow_type=outpass&status=PENDING&limit=100"),
      fetchJson("/api/permissions?workflow_type=staff_leave&status=PENDING&limit=100"),
      fetchJson("/api/permissions?status=ESCALATED&limit=50"),
      fetchJson("/api/occupancy/presence-matrix"),
      fetchJson("/api/students?scope=active"),
    ]);
    setOutpasses(outR.success ? ((outR.data as OutpassRow[]) ?? []) : null);
    setLeaves(leaveR.success ? ((leaveR.data as OutpassRow[]) ?? []) : null);
    setEscalated(escR.success ? ((escR.data as OutpassRow[]) ?? []) : null);
    setMatrix(matR.success ? ((matR.data as PresenceMatrixData) ?? null) : null);
    setStudents(stuR.success ? ((stuR.data as unknown[]) ?? []) : null);
    if (!outR.success && !matR.success) {
      setError(outR.error?.message ?? "Failed to load hostel data");
    }
    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  usePolling(refresh, { intervalMs: 60_000, enabled: !!user });

  const pendingHostel = (outpasses?.length ?? 0) + (leaves?.length ?? 0);

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 px-4 sm:px-6 py-6 sm:py-8 min-w-0">
      <Link
        href="/principal"
        className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="w-3 h-3" /> Back to Overview
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono">{role}</span> · tier {tier} · hostel oversight
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-center gap-2">
          <Flag className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
        <StatCard
          icon={Building2}
          label="Hostel Residents"
          value={students === null ? "…" : (students.length ?? 0)}
          sub="Active on-campus roster"
          accent="text-indigo-400"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Pending Hostel Requests"
          value={outpasses === null && leaves === null ? "…" : pendingHostel}
          sub="Outpass + staff leave at your stage"
          accent={pendingHostel > 0 ? "text-amber-400" : "text-emerald-400"}
        />
        <StatCard
          icon={Flag}
          label="Escalated Requests"
          value={escalated === null ? "…" : (escalated?.length ?? 0)}
          sub="Campus-wide escalations"
          accent={(escalated?.length ?? 0) > 0 ? "text-rose-400" : "text-emerald-400"}
        />
      </div>

      {/* Occupancy summary */}
      <HostelOverviewPanel matrix={matrix} pendingApprovals={pendingHostel} />
      <HostelOccupancyPanel roster={students as Parameters<typeof HostelOccupancyPanel>[0]["roster"]} />

      {/* Pending + escalated hostel requests */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 min-w-0">
        <OutpassLeavePanel outpasses={outpasses} leaves={leaves} loading={outpasses === null && leaves === null} error={null} />
        <WidgetBoundary title="Escalated Requests">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
            {escalated === null ? (
              <p className="text-sm text-[var(--text-muted)]">Loading…</p>
            ) : (escalated?.length ?? 0) === 0 ? (
              <EmptyState
                title="No escalations"
                description="Nothing has been escalated across the campus."
                icon={<Flag className="w-6 h-6 text-[var(--text-muted)]" />}
              />
            ) : (
              <ul className="space-y-2 min-w-0">
                {(escalated ?? []).slice(0, 10).map((r) => (
                  <li key={r.id} className="min-w-0 flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs text-[var(--text-primary)] shrink-0">{r.ticket_number}</span>
                    <span className="text-[var(--text-primary)] truncate min-w-0 flex-1">
                      {r.student?.name || "—"}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] capitalize shrink-0 whitespace-nowrap">
                      {r.workflow_type.replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </WidgetBoundary>
      </div>

      <DevContactStrip />
    </div>
  );
}
export default function HostelOversightPage() {
  return (
    <AuthGuard allowedRoles={['principal', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <HostelOversightInner />
      </Suspense>
    </AuthGuard>
  );
}
