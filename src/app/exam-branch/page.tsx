"use client";

import { Suspense, useCallback, useState } from "react";
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
  ClipboardCheck,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Loader2,
  Inbox,
  Clock,
  ArrowRight,
  DoorOpen,
  FileCheck2,
  Lock,
  DoorClosed,
} from "lucide-react";

/**
 * Exam Branch landing — the exam-operations workspace for oie / exam_branch /
 * vice_principal. Exam-branch-specific sections only:
 *   1. Exam Branch Overview KPIs (OIE-stage pending, VP-stage escalations, on-campus)
 *   2. OIE Queue (exam permissions at stage=oie)
 *   3. VP Escalation Queue (exam permissions at stage=vice_principal)
 *   4. Candidate Attendance (restricted at this tier — clean empty-state, no 403 banner)
 *   5. Examination-Day Gate Activity (per-gate presence-matrix counts)
 *   6. Reports & Approvals link + authority note
 *
 * The server scopes /api/permissions by the caller's role: oie sees its own
 * stage, vice_principal its own stage, and exam_branch (not in the
 * role→stage map) is queried with an explicit stage param so every queue is
 * server-scoped. Admin analytics endpoints are never fetched.
 */

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
    student_details?: { roll?: string; hostel_block?: string } | null;
  } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequestRow[];
  total?: number;
}

interface PresenceMatrixResponse {
  success: boolean;
  data: {
    gates: Array<{ id: string; name: string; code: string; audience?: string; type?: string }>;
    roles: string[];
    matrix: Record<string, Record<string, number>>;
    lastUpdated?: string;
  };
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

function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  restricted = false,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  message: string;
  restricted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-dashed p-8 text-center text-sm min-w-0 ${
        restricted
          ? "border-slate-700 bg-slate-800/30 text-slate-400"
          : "border-slate-700 bg-slate-800/30 text-slate-500"
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        <Icon className={`w-6 h-6 ${restricted ? "text-slate-500" : "text-slate-500"}`} />
        {title ? <p className="font-semibold text-slate-300">{title}</p> : null}
        <p className="max-w-md">{message}</p>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2 min-w-0">
      <span className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {message}
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

function SectionHeading({
  icon: Icon,
  title,
  sub,
  accent = "text-emerald-400",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${accent}`} />
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
      </div>
    </div>
  );
}

/* ── queue table (shared by OIE + VP queues) ── */

function QueueTable({
  rows,
  stageLabel,
  emptyMessage,
  statusClass,
}: {
  rows: PermissionRequestRow[];
  stageLabel: string;
  emptyMessage: string;
  statusClass: string;
}) {
  if (rows.length === 0) return <EmptyState message={emptyMessage} />;
  return (
    <div className="overflow-x-auto min-w-0">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
            <th className="text-left px-4 py-3">Ticket</th>
            <th className="text-left px-4 py-3">Candidate</th>
            <th className="text-left px-4 py-3">Stage</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3">SLA</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {rows.slice(0, 10).map((r) => (
            <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-3 text-white font-mono text-xs whitespace-nowrap">{r.ticket_number}</td>
              <td className="px-4 py-3 text-slate-300 min-w-0">
                {r.student?.name || "—"}
                {r.student?.student_details?.roll ? ` · ${r.student.student_details.roll}` : ""}
              </td>
              <td className="px-4 py-3 text-slate-400 capitalize whitespace-nowrap">{stageLabel}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${statusClass}`}
                >
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
    </div>
  );
}

/* ── main content ── */

function ExamBranchLandingInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "oie") as Role;
  const tier = getRoleTier(role);

  // The server scopes /api/permissions per caller role (oie → oie stage,
  // vice_principal → vice_principal stage). exam_branch is not in the
  // role→stage map, so pass the explicit stage param for it; each queue is
  // always server-scoped, never self-filtered from a broader feed.
  const isExamBranchRole = role === "exam_branch";
  const oieQueueUrl = isExamBranchRole
    ? "/api/permissions?workflowType=exam&status=PENDING&stage=oie"
    : "/api/permissions?workflowType=exam&status=PENDING";
  const vpQueueUrl =
    role === "vice_principal"
      ? "/api/permissions?workflowType=exam&status=PENDING"
      : "/api/permissions?workflowType=exam&status=PENDING&stage=vice_principal";

  const {
    data: oieData,
    loading: oieLoading,
    error: oieError,
    refresh: refreshOie,
  } = useApiResource<PermissionsResponse>(oieQueueUrl, { ttlMs: 30_000 });

  const {
    data: vpData,
    loading: vpLoading,
    error: vpError,
    refresh: refreshVp,
  } = useApiResource<PermissionsResponse>(vpQueueUrl, { ttlMs: 30_000 });

  const {
    data: presenceData,
    loading: presenceLoading,
    error: presenceError,
    refresh: refreshPresence,
  } = useApiResource<PresenceMatrixResponse>("/api/occupancy/presence-matrix", {
    ttlMs: 30_000,
  });

  const refresh = useCallback(async () => {
    clearCache();
    await Promise.all([refreshOie(), refreshVp(), refreshPresence()]);
  }, [refreshOie, refreshVp, refreshPresence]);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const oieRows = oieData?.data ?? [];
  const vpRows = vpData?.data ?? [];
  const oieTotal = oieData?.total ?? oieRows.length;
  const vpTotal = vpData?.total ?? vpRows.length;
  const oieSlaBreached = oieRows.filter((r) => {
    if (!r.sla_deadline) return false;
    const ts = new Date(r.sla_deadline).getTime();
    return !Number.isNaN(ts) && ts < Date.now();
  }).length;

  const anyQueueError = oieError || vpError;
  const queueLoading = (oieLoading && !oieData) || (vpLoading && !vpData);
  const presenceLoadingFlag = presenceLoading && !presenceData;
  const gates = presenceData?.data?.gates ?? [];
  const roles = presenceData?.data?.roles ?? [];
  const matrix = presenceData?.data?.matrix ?? {};
  const gateTotals = gates.map((g) => ({
    ...g,
    count: roles.reduce((n, r) => n + (matrix[g.id]?.[r] ?? 0), 0),
  }));
  const onCampusTotal = gateTotals.reduce((n, g) => n + g.count, 0);

  /* Attendance detail: /api/attendance_records and /api/staff/attendance
     exclude oie / exam_branch / vice_principal from their role lists, so
     it is restricted at this tier — the Candidate Attendance section renders
     a clean restricted empty-state (no 403 banner). */

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <span className="truncate">Exam Branch Dashboard</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Exam-operations workspace · signed in as{" "}
            <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
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

      {/* ── 1. Exam Branch Overview ── */}
      <WidgetBoundary title="Exam Branch Overview">
        <div className="space-y-3 min-w-0">
          <SectionHeading
            icon={ClipboardCheck}
            title="Exam Branch Overview"
            sub="Live exam-stage KPIs — server-scoped to your queues"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
            <StatCard
              icon={Inbox}
              label="OIE-Stage Pending"
              value={oieTotal}
              sub="Exam clearances awaiting OIE review"
              accent="text-emerald-400"
              loading={oieLoading && !oieData}
            />
            <StatCard
              icon={UserCheck}
              label="VP-Stage Escalations"
              value={vpTotal}
              sub="Exam requests escalated to Vice Principal"
              accent="text-sky-400"
              loading={vpLoading && !vpData}
            />
            <StatCard
              icon={DoorOpen}
              label="On Campus Now"
              value={presenceData ? onCampusTotal : "—"}
              sub="All roles inside active gates (live)"
              accent="text-amber-400"
              loading={presenceLoadingFlag}
            />
            <StatCard
              icon={ShieldCheck}
              label="Total Open"
              value={oieTotal + vpTotal}
              sub="All pending exam-stage approvals"
              accent="text-white"
              loading={queueLoading}
            />
          </div>
        </div>
      </WidgetBoundary>

      {/* queue error banner (one for both queues) */}
      {anyQueueError && (
        <ErrorBanner
          message={`Exam queue loading failed: ${anyQueueError}`}
          onRetry={() => void (oieError ? refreshOie() : refreshVp())}
        />
      )}

      {/* ── 2. OIE Queue ── */}
      <WidgetBoundary title="OIE Queue">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden space-y-3 p-4 min-w-0">
          <SectionHeading
            icon={Inbox}
            title={`OIE Queue ${oieTotal > 0 ? `(${oieTotal})` : ""}`}
            sub="Exam permissions pending at the examination-officer stage"
            accent="text-emerald-400"
          />
          {oieLoading && !oieData ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading OIE queue…
            </div>
          ) : oieError ? (
            <ErrorBanner
              message={`OIE queue: ${oieError}`}
              onRetry={() => void refreshOie()}
            />
          ) : (
            <QueueTable
              rows={oieRows}
              stageLabel="OIE"
              emptyMessage="No pending OIE exam clearances. The queue is clear."
              statusClass="border-amber-400/30 bg-amber-400/10 text-amber-400"
            />
          )}
        </div>
      </WidgetBoundary>

      {/* ── 3. VP Escalation Queue ── */}
      <WidgetBoundary title="VP Escalation Queue">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden space-y-3 p-4 min-w-0">
          <SectionHeading
            icon={UserCheck}
            title={`VP Escalation Queue ${vpTotal > 0 ? `(${vpTotal})` : ""}`}
            sub="Exam permissions escalated to the Vice Principal stage"
            accent="text-sky-400"
          />
          {vpLoading && !vpData ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading VP queue…
            </div>
          ) : vpError ? (
            <ErrorBanner
              message={`VP queue: ${vpError}`}
              onRetry={() => void refreshVp()}
            />
          ) : (
            <QueueTable
              rows={vpRows}
              stageLabel="Vice Principal"
              emptyMessage="No pending Vice Principal review items. Escalations are clear."
              statusClass="border-sky-400/30 bg-sky-400/10 text-sky-400"
            />
          )}
        </div>
      </WidgetBoundary>

      {/* ── 4. Candidate Attendance ── */}
      <WidgetBoundary title="Candidate Attendance">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 min-w-0">
          <SectionHeading
            icon={FileCheck2}
            title="Candidate Attendance"
            sub="Exam-day candidate attendance roll-up"
            accent="text-violet-400"
          />
          <EmptyState
            restricted
            icon={Lock}
            title="Attendance detail is restricted at this tier"
            message="Candidate attendance records are available to the examination office and higher tiers only. Use the reports and approvals desk below for candidate-level records."
          />
        </div>
      </WidgetBoundary>

      {/* ── 5. Examination-Day Gate Activity ── */}
      <WidgetBoundary title="Examination-Day Gate Activity">
        <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden space-y-3 p-4 min-w-0">
          <SectionHeading
            icon={DoorOpen}
            title="Examination-Day Gate Activity"
            sub="Per-gate live presence (roles currently inside)"
            accent="text-amber-400"
          />
          {presenceLoadingFlag ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500 min-w-0">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" /> Loading gate activity…
            </div>
          ) : presenceError ? (
            <ErrorBanner
              message={`Gate activity: ${presenceError}`}
              onRetry={() => void refreshPresence()}
            />
          ) : gateTotals.length === 0 ? (
            <EmptyState
              icon={DoorClosed}
              message="No active gates are reporting presence right now."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
              {gateTotals.map((g) => (
                <div
                  key={g.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 min-w-0"
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {g.name}
                      {g.code ? <span className="font-mono text-xs text-slate-500"> · {g.code}</span> : null}
                    </p>
                    <span
                      className={`text-lg font-bold shrink-0 ${g.count > 0 ? "text-amber-400" : "text-slate-600"}`}
                    >
                      {g.count}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {g.count > 0
                      ? `people on campus via ${g.name}`
                      : "no one on campus via this gate"}
                  </p>
                </div>
              ))}
              {presenceData?.data?.lastUpdated ? (
                <p className="sm:col-span-2 lg:col-span-3 text-xs text-slate-600">
                  Updated {new Date(presenceData.data.lastUpdated).toLocaleString()}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* ── 6. Reports & Approvals ── */}
      <WidgetBoundary title="Reports & Approvals">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-4 space-y-3 min-w-0">
          <SectionHeading
            icon={FileCheck2}
            title="Reports & Approvals"
            sub="Full action desk for the exam branch"
            accent="text-emerald-400"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <p className="text-sm text-slate-400 min-w-0">
              Forward / reject exam clearances with remarks, escalate to the Vice Principal, and
              track exam-day outcomes from the approvals desk.
            </p>
            <a
              href="/exam/permissions"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 sm:shrink-0"
            >
              Open Exam Approvals <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
            <p className="text-xs leading-relaxed text-slate-500">
              <span className="font-semibold text-slate-400">Authority note:</span>{" "}
              examination marks and confidential results must not become available merely because
              this role can view attendance or gate presence. Result disclosure follows the
              examination office&apos;s release procedure — the exam branch sees candidate
              attendance and gate activity, never graded outcomes.
            </p>
          </div>
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function ExamBranchLandingPage() {
  return (
    <GuardedPage
      allowedRoles={["oie", "exam_branch", "vice_principal", "admin", "sysadmin"]}
    >
      <Suspense fallback={<PageLoading />}>
        <ExamBranchLandingInner />
      </Suspense>
    </GuardedPage>
  );
}
