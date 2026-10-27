<<<<<<< HEAD
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
=======
import { Suspense } from "react";
import { ClipboardCheck } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { QuickActions } from "@/components/shared/QuickActions";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { AttentionQueue } from "@/components/engagement/AttentionQueue";
import { ActivityTimeline } from "@/components/engagement/ActivityTimeline";
import { PersonalizedCampusHome } from "@/components/retention/PersonalizedCampusHome";
import { TaskContinuity } from "@/components/retention/TaskContinuity";
import { UnifiedCampusCalendar } from "@/components/retention/UnifiedCampusCalendar";
import { RoleDashboardPanel } from "@/components/approver/RoleDashboardPanel";

<<<<<<< HEAD
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Loader2,
  Inbox,
  Clock,
  ArrowRight,
  FileText,
  ScrollText,
  BellOff,
  CheckSquare,
  Lock,
} from "lucide-react";

/**
 * OIE (Officer Incharge Examinations) dedicated dashboard — examination-
 * operations focused, NOT a broad institutional dashboard.
 *
 * Data sources (all verified 200 for the oie role):
 *   • /api/permissions?workflow_type=exam&stage=oie&status=PENDING — the OIE
 *     exam-stage queue (the OIE role's assigned duties)
 *   • /api/occupancy/presence-matrix — on-campus presence by gate × role
 *
 * Endpoints that are 403 for oie (/api/staff/attendance, /api/staff/stats,
 * /api/attendance_records, /api/alerts, and everything under /api/admin/*)
 * are NEVER fetched — restricted panels render a clean "restricted /
 * assigned-only" empty-state instead of a 403 banner.
 */

/* ── response shapes (mirror /api/permissions) ── */

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

/* ── response shapes (mirror /api/occupancy/presence-matrix) ── */

interface PresenceMatrixData {
  gates: Array<{ id: string; name: string; code: string; audience: string; type: string }>;
  roles: string[];
  matrix: Record<string, Record<string, number>>;
  lastUpdated: string;
}

interface PresenceMatrixResponse {
  success: boolean;
  data: PresenceMatrixData;
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

function EmptyState({ message, restricted }: { message: string; restricted?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-8 text-center text-sm min-w-0 ${
        restricted
          ? "border-dashed border-slate-700 bg-slate-800/30 text-slate-500"
          : "border border-slate-800 bg-[#111827] text-slate-400"
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        {restricted ? <Lock className="w-5 h-5 text-slate-600" /> : <Inbox className="w-5 h-5 text-slate-600" />}
        <p className="max-w-md">{message}</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">{message}</span>
      </span>
      <button
        onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
      >
        Retry
      </button>
    </div>
  );
}

/** Ticket table shared by the records + tasks panels. */
function TicketTable({
  rows,
  linkLabel,
}: {
  rows: PermissionRequestRow[];
  linkLabel?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState message="No pending items at the OIE examination stage. The queue is clear." />;
  }
  return (
    <div className="overflow-x-auto min-w-0">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3">Ticket</th>
            <th className="text-left px-4 py-3">Student</th>
            <th className="text-left px-4 py-3">Workflow</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">SLA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {rows.slice(0, 15).map((r) => (
            <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-3">
                <a
                  href={`/permissions/${r.ticket_number}`}
                  className="text-white font-mono text-xs whitespace-nowrap hover:text-emerald-400"
                >
                  {r.ticket_number}
                </a>
              </td>
              <td className="px-4 py-3 text-slate-300 min-w-0">
                {r.student?.name || "—"}
                {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
              </td>
              <td className="px-4 py-3 text-slate-400 capitalize whitespace-nowrap">
                {r.workflow_type.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-3">
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-amber-400/30 bg-amber-400/10 text-amber-400 whitespace-nowrap">
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
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
      {linkLabel && (
        <div className="px-4 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0">
          <p className="text-xs text-slate-500 min-w-0">
            {rows.length} pending at the OIE stage — all are actionable.
          </p>
          <a
            href="/exam/permissions"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
          >
            {linkLabel} <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

/* ── main content ── */

function OieDashboardInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "oie") as Role;
  const tier = getRoleTier(role);

  // The server scopes /api/permissions to current_stage=oie for the oie role;
  // the explicit stage param pins the queue to the OIE examination step.
  const {
    data: oieQueue,
    loading: queueLoading,
    error: queueError,
    refresh: refreshQueue,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflow_type=exam&stage=oie&status=PENDING",
    { ttlMs: 30_000 }
  );

  const {
    data: presence,
    loading: presenceLoading,
    error: presenceError,
    refresh: refreshPresence,
  } = useApiResource<PresenceMatrixResponse>("/api/occupancy/presence-matrix", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refreshQueue(), refreshPresence()]);
  }, [refreshQueue, refreshPresence]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const oieRows = oieQueue?.data ?? [];
  const oieTotal = oieQueue?.total ?? oieRows.length;
  const oieSlaBreached = oieRows.filter((r) => {
    if (!r.sla_deadline) return false;
    const ts = new Date(r.sla_deadline).getTime();
    return !Number.isNaN(ts) && ts < Date.now();
  }).length;

  // On-campus count: total people currently inside all active gates.
  const matrix = presence?.data?.matrix ?? {};
  const gates = presence?.data?.gates ?? [];
  const onCampusTotal = gates.reduce(
    (sum, g) => sum + Object.values(matrix[g.id] ?? {}).reduce((a, b) => a + b, 0),
    0
  );

  const queueBusy = (queueLoading || presenceLoading) && !oieQueue && !presence;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refreshAll()}
          disabled={queueLoading || presenceLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50 shrink-0"
        >
          {queueLoading || presenceLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {queueLoading || presenceLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* global error banner */}
      {queueError && (
        <ErrorBanner
          message={`OIE queue loading failed: ${queueError}`}
          onRetry={() => void refreshQueue()}
        />
      )}

      {/* 1 · OIE Overview — KPI row */}
      <WidgetBoundary title="OIE Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
          <StatCard
            icon={Inbox}
            label="OIE Pending"
            value={oieTotal}
            sub="Exam permissions awaiting OIE review"
            accent="text-emerald-400"
            loading={queueLoading && !oieQueue}
          />
          <StatCard
            icon={AlertTriangle}
            label="SLA Breached"
            value={oieSlaBreached}
            sub="OIE queue past their 48h deadline"
            accent="text-amber-400"
            loading={queueLoading && !oieQueue}
          />
          <StatCard
            icon={UserCheck}
            label="On Campus"
            value={onCampusTotal}
            sub="People currently inside active gates (live presence matrix)"
            accent="text-sky-400"
            loading={presenceLoading && !presence}
          />
          <StatCard
            icon={ShieldCheck}
            label="Stage"
            value="oie"
            sub="Examination-branch approval step"
            accent="text-white"
          />
        </div>
      </WidgetBoundary>

      {/* presence-matrix error — friendly, no 403 banner */}
      {presenceError && (
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-3 text-xs text-slate-500 min-w-0">
          Live campus presence is unavailable right now — this panel does not affect the
          examination queues below.
        </div>
      )}

      {/* 2 · Assigned Operational Records */}
      <WidgetBoundary title="Assigned Operational Records">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                OIE Examination-Stage Queue
              </span>
            </div>
            <span className="text-xs text-slate-500 shrink-0">assigned duties only</span>
          </div>
          {queueLoading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading OIE queue…
            </div>
          ) : (
            <TicketTable rows={oieRows} />
          )}
          <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500 min-w-0">
            Broader institutional records (staff attendance, attendance statistics) are
            restricted at this tier — this desk surfaces only the records assigned to the
            OIE examination duties.
          </div>
        </div>
      </WidgetBoundary>

      {/* 3 · Inspection or Activity Logs */}
      <WidgetBoundary title="Inspection or Activity Logs">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <ScrollText className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">Recent OIE Activity</span>
          </div>
          <EmptyState
            restricted
            message="No dedicated activity-log source is exposed at this tier. Audit and telemetry streams are admin-scoped; OIE operational activity is visible through the assigned queue above."
          />
        </div>
      </WidgetBoundary>

      {/* 4 · Exceptions and Incidents */}
      <WidgetBoundary title="Exceptions and Incidents">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <BellOff className="w-4 h-4 text-amber-400/70 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              OIE-Flagged Exceptions
            </span>
          </div>
          <EmptyState
            restricted
            message="Incident and alert feeds are admin-scoped and not available at this tier. The only exception OIE can act on is SLA breach in its own queue — flagged above."
          />
        </div>
      </WidgetBoundary>

      {/* 5 · Assigned Tasks */}
      <WidgetBoundary title="Assigned Tasks">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-w-0">
            <CheckSquare className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
              Actionable at the OIE Step
            </span>
          </div>
          {queueLoading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading tasks…
            </div>
          ) : oieRows.length === 0 ? (
            <EmptyState message="No tasks awaiting the OIE step. Nothing needs action right now." />
          ) : (
            <TicketTable rows={oieRows} linkLabel="Open Approvals Desk" />
          )}
        </div>
      </WidgetBoundary>

      {/* 6 · Reports and Approvals */}
      <WidgetBoundary title="Reports and Approvals">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <p className="text-sm text-slate-300">
                OIE approval actions — approve, forward or reject with remarks — run from the
                examination approvals desk.
              </p>
              <p className="mt-2 text-xs text-slate-500 min-w-0">
                OIE is restricted to the actual duties assigned to OIE; examination marks and
                confidential results are not exposed by viewing attendance.
              </p>
            </div>
            <a
              href="/exam/permissions"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 shrink-0"
            >
              Exam Approvals Desk <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function OieDashboardPage() {
=======
export default function OiePage() {
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31
  return (
    <Suspense fallback={<PageLoading />}>
      <AuthGuard allowedRoles={["oie"]}>
        <div className="space-y-6">
          <DevContactStrip />
          <WidgetBoundary>
            <RoleDashboardPanel
              title="OIE dashboard"
              icon={ClipboardCheck}
              endpoint="/api/oie/queue"
              mapKpis={(raw: any) => {
                const list = Array.isArray(raw) ? raw : [];
                return [
                  { label: "Queue length", value: list.length, tone: list.length > 0 ? "warn" as const : "ok" as const },
                ];
              }}
            />
          </WidgetBoundary>
          <WidgetBoundary><AttentionQueue /></WidgetBoundary>
          <WidgetBoundary><PersonalizedCampusHome /></WidgetBoundary>
          <WidgetBoundary><TaskContinuity /></WidgetBoundary>
          <WidgetBoundary><UnifiedCampusCalendar /></WidgetBoundary>
          <WidgetBoundary><ActivityTimeline /></WidgetBoundary>
          <WidgetBoundary><QuickActions /></WidgetBoundary>
          <WidgetBoundary><NotificationCenter /></WidgetBoundary>
        </div>
      </AuthGuard>
    </Suspense>
  );
}
