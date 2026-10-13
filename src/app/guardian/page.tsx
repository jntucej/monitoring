"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useMemo } from "react";
import Link from "next/link";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useApiResource } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role, Person, GatePass } from "@/lib/types";
import {
  ShieldCheck,
  Users,
  Clock,
  Ticket,
  AlertTriangle,
  Loader2,
  Inbox,
  GraduationCap,
} from "lucide-react";

const MIN_TIER = 30;

/* ── response shapes ── */

interface PersonsResponse {
  success: boolean;
  data: Person[];
}

interface PassesResponse {
  success: boolean;
  data: GatePass[];
}

interface PermissionRow {
  id: string;
  ticket_number?: string;
  workflow_type?: string;
  status?: string;
  student_user_id?: string | null;
  created_at?: string;
}

interface PermissionListData {
  success: boolean;
  data: PermissionRow[];
  total?: number;
}

/* ── building blocks ── */

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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        <Icon className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-[var(--text-muted)]">{sub}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-base)]/60 p-8 text-center text-sm text-[var(--text-muted)]">
      {message}
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200 flex items-center justify-between gap-3">
      <span className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {message}
      </span>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/30"
      >
        Retry
      </button>
    </div>
  );
}

/* ── main content ── */

function GuardianDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "guardian") as Role;
  const tier = getRoleTier(role);
  const userId = user?.id ?? "";

  // Linked wards (children_of this guardian)
  const {
    data: persons,
    loading: personsLoading,
    error: personsError,
    refresh: refreshPersons,
  } = useApiResource<PersonsResponse>("/api/persons?parentId=me", {
    ttlMs: 30_000,
    enabled: !!userId,
  });

  // Passes under the guardian's supervision
  const {
    data: passes,
    loading: passesLoading,
    error: passesError,
    refresh: refreshPasses,
  } = useApiResource<PassesResponse>(
    `/api/passes?parentId=${encodeURIComponent(userId)}`,
    { ttlMs: 30_000, enabled: !!userId }
  );

  // Pending approvals scoped to this guardian
  const {
    data: pending,
    loading: pendingLoading,
    error: pendingError,
    refresh: refreshPending,
  } = useApiResource<PermissionListData>("/api/permissions?status=PENDING", {
    ttlMs: 60_000,
    enabled: !!userId,
  });

  const refresh = useCallback(async () => {
    await Promise.all([refreshPersons(), refreshPasses(), refreshPending()]);
  }, [refreshPersons, refreshPasses, refreshPending]);

  usePolling(refresh, { intervalMs: 60_000, enabled: !!userId });

  const wards = persons?.data ?? [];
  const passList: GatePass[] = passes?.data ?? [];
  const pendingRows = useMemo<PermissionRow[]>(() => {
    const rows = pending?.data;
    return Array.isArray(rows) ? rows : [];
  }, [pending]);

  const wardsWithWarden = wards.filter((w) => w.studentDetails?.wardenId).length;
  const onCampus = wards.filter((w) => w.checkedInAt && !w.checkedOutAt).length;

  const pendingPasses = passList.filter(
    (p: GatePass) => p.finalStatus === "PENDING" || p.finalStatus === "APPROVED_PARENT"
  );

  const anyError = !!(personsError || passesError || pendingError);
  const loading = personsLoading || passesLoading || pendingLoading;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 min-w-0">
      {/* header */}
      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Guardian Dashboard
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Signed in as <span className="font-mono text-[var(--text-secondary)]">{role}</span> ·
            tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {anyError && (
        <ErrorBanner
          message={personsError || passesError || pendingError || "Some panels failed to load."}
          onRetry={() => void refresh()}
        />
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={GraduationCap}
          label="Warden-Assigned Wards"
          value={wardsWithWarden}
          sub="Wards with an assigned warden"
          accent="text-emerald-400"
          loading={personsLoading && wards.length === 0}
        />
        <StatCard
          icon={Users}
          label="Wards Under Supervision"
          value={wards.length}
          sub={onCampus > 0 ? `${onCampus} currently on campus` : "No wards currently on campus"}
          accent="text-sky-400"
          loading={personsLoading && wards.length === 0}
        />
        <StatCard
          icon={Inbox}
          label="Pending Approvals"
          value={pendingRows.length || pending?.total || 0}
          sub="Permission requests awaiting action"
          accent="text-amber-400"
          loading={pendingLoading && pendingRows.length === 0}
        />
        <StatCard
          icon={Ticket}
          label="Ward Passes In Play"
          value={passList.length}
          sub={`${pendingPasses.length} still pending`}
          accent="text-emerald-400"
          loading={passesLoading && passList.length === 0}
        />
      </div>

      {/* pending approval list */}
      <WidgetBoundary title="Pending Approvals">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Pending Approvals
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              {pendingRows.length > 0 ? `${pendingRows.length} waiting` : "queue clear"}
            </span>
          </div>
          {pendingLoading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading pending requests…
            </div>
          ) : pendingRows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                message={
                  pendingError
                    ? "Could not load pending approvals."
                    : "No pending approvals under your supervision."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Ticket</th>
                    <th className="text-left px-4 py-3">Workflow</th>
                    <th className="text-left px-4 py-3">Ward</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Raised</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/60">
                  {pendingRows.slice(0, 15).map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-base)]/40 transition-colors">
                      <td className="px-4 py-3 text-white font-mono text-xs">
                        {r.ticket_number || r.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {r.workflow_type || "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] font-mono text-xs">
                        {r.student_user_id ? r.student_user_id.slice(0, 8) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border text-amber-400 border-amber-400/30 bg-amber-400/10">
                          {r.status || "PENDING"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* ward list */}
      <WidgetBoundary title="Wards">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Wards Under Supervision
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              {persons?.success ? `${wards.length} wards` : "…"}
            </span>
          </div>
          {personsLoading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading wards…
            </div>
          ) : wards.length === 0 ? (
            <div className="p-4">
              <EmptyState
                message={
                  personsError
                    ? "Could not load your wards."
                    : "No wards linked to your account yet."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Roll</th>
                    <th className="text-left px-4 py-3">Warden</th>
                    <th className="text-left px-4 py-3">Gate State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/60">
                  {wards.map((w) => (
                    <tr key={w.id} className="hover:bg-[var(--bg-base)]/40 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{w.fullName}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] font-mono text-xs">
                        {w.uniqueId || w.roll || "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {w.studentDetails?.wardenId ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border text-emerald-400 border-emerald-400/30 bg-emerald-400/10">
                            Assigned
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border text-slate-400 border-slate-400/30 bg-slate-400/10">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {w.checkedInAt && !w.checkedOutAt ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border text-emerald-400 border-emerald-400/30 bg-emerald-400/10">
                            On campus
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border text-slate-400 border-slate-400/30 bg-slate-400/10">
                            Off campus
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </WidgetBoundary>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Link
          href="/parent/passes"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:opacity-90"
        >
          <Ticket className="w-4 h-4 text-emerald-400" />
          View all ward passes
        </Link>
        <Link
          href="/parent/child"
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:opacity-90"
        >
          <Users className="w-4 h-4 text-emerald-400" />
          Child details
        </Link>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function GuardianDashboardPage() {
  return (
    <GuardedPage minTier={MIN_TIER} allowedRoles={["guardian"]}>
      <Suspense fallback={<PageLoading />}>
        <GuardianDashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
