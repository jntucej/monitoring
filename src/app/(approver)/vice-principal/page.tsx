"use client";

import { Suspense, useCallback, useState, useMemo } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import {
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Loader2,
  Inbox,
  Clock,
  ArrowRight,
  Building2,
  MapPin,
  FileText,
  CheckCircle2,
  ScrollText,
  Lock,
} from "lucide-react";

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

interface DepartmentRow {
  code: string;
  name: string;
  hod?: string;
}

interface PresenceMatrix {
  gates?: Array<{ id: string; name?: string; code?: string }>;
  roles?: string[];
  matrix?: Record<string, Record<string, number>>;
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
    <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function EmptyState({ message, restricted = false }: { message: string; restricted?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-8 text-center text-sm flex flex-col items-center gap-2 ${
        restricted
          ? "border-slate-700 bg-slate-800/20 text-slate-500"
          : "border-dashed border-slate-700 bg-slate-800/30 text-slate-500"
      }`}
    >
      {restricted && <Lock className="w-5 h-5 text-slate-600" />}
      {message}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-slate-400 mb-3 min-w-0">
      <Icon className="w-4 h-4 shrink-0" />
      <div className="min-w-0">
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── panel wrappers ── */

function Panel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <WidgetBoundary title={title}>
      <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">{children}</div>
    </WidgetBoundary>
  );
}

/* ── main content ── */

function VicePrincipalDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "vice_principal") as Role;
  const tier = getRoleTier(role);

  /* ── data fetches ── */
  const {
    data: vpQueue,
    loading,
    error,
    refresh,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?status=PENDING&stage=vice_principal",
    { ttlMs: 30_000 }
  );

  const { data: departments } = useApiResource<{ success: boolean; data: DepartmentRow[] }>(
    "/api/departments",
    { ttlMs: 60_000 }
  );

  const { data: matrix } = useApiResource<{ success: boolean; data: PresenceMatrix }>(
    "/api/occupancy/presence-matrix",
    { ttlMs: 30_000 }
  );

  const rows = vpQueue?.data ?? [];
  const total = vpQueue?.total ?? rows.length;
  const slaBreached = rows.filter((r) => {
    if (!r.sla_deadline) return false;
    const ts = new Date(r.sla_deadline).getTime();
    return !Number.isNaN(ts) && ts < Date.now();
  }).length;

  const deptList = (departments?.data ?? []) as DepartmentRow[];

  const gateTotals = useMemo(() => {
    const gates = matrix?.data?.gates ?? [];
    const m = matrix?.data?.matrix ?? {};
    const roles = matrix?.data?.roles ?? [];
    return gates.map((g) => ({
      ...g,
      total: roles.reduce((sum, r) => sum + (m[g.id]?.[r] ?? 0), 0),
    }));
  }, [matrix]);

  const onCampus = gateTotals.reduce((sum, g) => sum + g.total, 0);

  /* ── delegated tasks: items escalated TO the VP stage ── */
  const delegated = useMemo(() => {
    return rows.filter((r) => r.workflow_type === "exam" || r.workflow_type === "memo");
  }, [rows]);

  const refreshAll = useCallback(async () => {
    clearCache();
    await refresh();
  }, [refresh]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const [activeTab, setActiveTab] = useState<"all" | "exam" | "memo" | "staff_leave">("all");
  const filtered = activeTab === "all" ? rows : rows.filter((r) => r.workflow_type === activeTab);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Page toolbar — global DynamicHeader already renders the app header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-sky-400 shrink-0" />
            <span className="truncate">Vice Principal Desk</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refreshAll()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Escalation queue loading failed: {error}
          </span>
          <button
            onClick={() => void refreshAll()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* 1. Executive Overview */}
      <Panel title="Executive Overview">
        <SectionHeader
          icon={Inbox}
          title="Executive Overview"
          sub="Institutional summary for the Vice Principal"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0">
          <StatCard
            icon={Inbox}
            label="VP Pending"
            value={total}
            sub="Requests at the Vice Principal stage"
            accent="text-sky-400"
            loading={loading && !vpQueue}
          />
          <StatCard
            icon={AlertTriangle}
            label="SLA Breached"
            value={slaBreached}
            sub="VP queue past deadline"
            accent="text-amber-400"
            loading={loading && !vpQueue}
          />
          <StatCard
            icon={MapPin}
            label="On Campus"
            value={onCampus}
            sub="Across all gates"
            accent="text-emerald-400"
          />
          <StatCard
            icon={ShieldCheck}
            label="Departments"
            value={deptList.length}
            sub="Active departments"
            accent="text-violet-400"
          />
        </div>
      </Panel>

      {/* 2. Academic and Department Analytics */}
      <Panel title="Academic and Department Analytics">
        <SectionHeader
          icon={Building2}
          title="Academic & Department Analytics"
          sub="Per-department summary"
        />
        {deptList.length === 0 ? (
          <EmptyState message="No department data available." />
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800">
                  <th className="text-left px-3 py-2">Department</th>
                  <th className="text-left px-3 py-2">HOD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {deptList.map((d) => (
                  <tr key={d.code} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 text-slate-200">{d.name}</td>
                    <td className="px-3 py-2 text-slate-400">{d.hod || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* 3. Attendance Exceptions */}
      <Panel title="Attendance Exceptions">
        <SectionHeader
          icon={CheckCircle2}
          title="Attendance Exceptions"
          sub="Staff attendance detail is restricted at the VP tier"
        />
        <EmptyState
          restricted
          message="Attendance detail is available to admin and sysadmin only. Request access from the institution administrator."
        />
      </Panel>

      {/* 4. Gate and Incident Summary */}
      <Panel title="Gate and Incident Summary">
        <SectionHeader
          icon={MapPin}
          title="Gate & Incident Summary"
          sub="Per-gate on-campus presence"
        />
        {gateTotals.length === 0 ? (
          <EmptyState message="No gate data available." />
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800">
                  <th className="text-left px-3 py-2">Gate</th>
                  <th className="text-left px-3 py-2">On Campus</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {gateTotals.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 text-slate-200">{g.name || g.code || g.id.slice(0, 8)}</td>
                    <td className="px-3 py-2">
                      <span className={`font-bold ${g.total > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                        {g.total}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          g.total > 0
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-500/15 text-slate-400"
                        }`}
                      >
                        {g.total > 0 ? "Active" : "Clear"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-600 mt-3">
          Incident data is admin-scoped and not shown at this tier.
        </p>
      </Panel>

      {/* 5. Pending Approvals (the core escalation queue) */}
      <Panel title="Pending Approvals">
        <SectionHeader
          icon={Inbox}
          title="Pending Approvals — VP Stage"
          sub="Requests escalated to the Vice Principal"
        />
        {/* workflow filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto mb-3 min-w-0">
          {(
            [
              { id: "all", label: "All" },
              { id: "exam", label: "Exam" },
              { id: "memo", label: "Memo" },
              { id: "staff_leave", label: "Staff Leave" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0 ${
                activeTab === t.id
                  ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
              }`}
            >
              {t.label}
              {t.id !== "all" ? ` (${rows.filter((r) => r.workflow_type === t.id).length})` : ""}
            </button>
          ))}
        </div>
        {loading && !vpQueue ? (
          <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading queue…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState message="No pending items at the Vice Principal stage. The queue is clear." />
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800">
                  <th className="text-left px-3 py-2">Ticket</th>
                  <th className="text-left px-3 py-2">Student</th>
                  <th className="text-left px-3 py-2">Workflow</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.slice(0, 15).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30">
                    <td className="px-3 py-2 text-white font-mono text-xs whitespace-nowrap">{r.ticket_number}</td>
                    <td className="px-3 py-2 text-slate-300 min-w-0">
                      {r.student?.name || "—"}
                      {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
                    </td>
                    <td className="px-3 py-2 text-slate-400 capitalize whitespace-nowrap">
                      {r.workflow_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-amber-400/30 bg-amber-400/10 text-amber-400 whitespace-nowrap">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">
                      {r.sla_deadline ? (
                        new Date(r.sla_deadline).getTime() < Date.now() ? (
                          <span className="text-rose-400">
                            Breached · {new Date(r.sla_deadline).toLocaleString()}
                          </span>
                        ) : (
                          new Date(r.sla_deadline).toLocaleString()
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* 6. Staff and Operational Reports */}
      <Panel title="Staff and Operational Reports">
        <SectionHeader
          icon={FileText}
          title="Staff & Operational Reports"
          sub="Institutional staffing summary"
        />
        <EmptyState
          restricted
          message="Staff and operational reports are available to admin and sysadmin only. Request access from the institution administrator."
        />
      </Panel>

      {/* 7. Delegated Tasks */}
      <Panel title="Delegated Tasks">
        <SectionHeader
          icon={ArrowRight}
          title="Delegated Tasks"
          sub="Items escalated to you for review"
        />
        {delegated.length === 0 ? (
          <EmptyState message="No delegated tasks at the Vice Principal stage." />
        ) : (
          <ul className="space-y-2 min-w-0">
            {delegated.slice(0, 10).map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 min-w-0 text-sm text-slate-300 hover:bg-slate-800/30 rounded-lg px-2 py-1.5"
              >
                <span className="font-mono text-xs text-sky-400 shrink-0">{r.ticket_number}</span>
                <span className="truncate min-w-0">
                  {r.student?.name || "Unknown"} · {r.workflow_type.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-slate-500 ml-auto shrink-0">
                  {new Date(r.sla_deadline || Date.now()).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* 8. Reports and Approvals — authority note */}
      <Panel title="Reports and Approvals">
        <SectionHeader
          icon={ScrollText}
          title="Reports & Approvals"
          sub="Authority boundary"
        />
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-slate-300 space-y-2 min-w-0">
          <p>
            The Vice Principal handles <strong className="text-sky-300">delegated institutional operations</strong>.
            Principal-level approval powers are <strong className="text-sky-300">configurable</strong>, not automatically inherited.
          </p>
          <p className="text-xs text-slate-500">
            For full approval actions (forward, reject with remarks, bulk operations), use the approvals desk.
          </p>
          <a
            href="/exam/permissions"
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-400 hover:bg-sky-500/20"
          >
            Open Approvals Desk <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </Panel>

      <DevContactStrip />
    </div>
  );
}

export default function VicePrincipalDashboardPage() {
  return (
    <GuardedPage allowedRoles={["vice_principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <VicePrincipalDashboardInner />
      </Suspense>
    </GuardedPage>
  );
}
