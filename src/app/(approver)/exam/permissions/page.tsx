"use client";

import { Suspense, useState } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { Tabs } from "@/components/ui/tabs";
import { PermissionList } from "@/components/approver/PermissionList";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { getAuthHeaders } from "@/lib/utils";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import {
  ClipboardCheck,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Loader2,
  Inbox,
  Clock,
} from "lucide-react";


/* ── response shapes (mirror /api/permissions) ── */

interface PermissionRequestRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  student?: {
    id: string;
    name: string;
    student_details?: { roll?: string; hostel_block?: string } | null;
  } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequestRow[];
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/30 p-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200 flex flex-wrap items-center justify-between gap-2">
      <span className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {message}
      </span>
      <button
        onClick={onRetry}
        className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20"
      >
        Retry
      </button>
    </div>
  );
}

/* ── main content ── */

function ExamPermissionsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_branch") as Role;
  const tier = getRoleTier(role);

  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("tab") as string) || "oie"
      : "oie"
  );

  const tabs = [
    {
      id: "oie",
      label: "OIE Queue",
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: "vice_principal",
      label: "VP Queue",
      icon: <UserCheck className="w-4 h-4" />,
    },
  ];

  // KPI fetches — /api/permissions filters by the caller's stage server-side,
  // so each queue shows its own pending count.
  const {
    data: oieData,
    loading: oieLoading,
    error: oieError,
    refresh: refreshOie,
  } = useApiResource<PermissionsResponse>("/api/permissions?workflowType=exam&status=PENDING", {
    ttlMs: 30_000,
  });

  const {
    data: vpData,
    loading: vpLoading,
    refresh: refreshVp,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflowType=exam&status=PENDING&stage=vice_principal",
    { ttlMs: 30_000 }
  );

  const refresh = async () => {
    clearCache();
    await Promise.all([refreshOie(), refreshVp()]);
  };
  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

  const oieTotal = oieData?.total ?? oieData?.data?.length ?? 0;
  const vpTotal = vpData?.total ?? vpData?.data?.length ?? 0;

  const oieSlaBreached = (oieData?.data ?? []).filter((r) => {
    if (!r.sla_deadline) return false;
    const ts = new Date(r.sla_deadline).getTime();
    return !Number.isNaN(ts) && ts < Date.now();
  }).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-emerald-400" />
            Exam Branch Permissions
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={oieLoading || vpLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
        >
          {(oieLoading || vpLoading) ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          {(oieLoading || vpLoading) ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {/* error banner */}
      {(oieError || (!oieData && !oieLoading)) && (
        <ErrorBanner
          message={`Exam queue loading failed: ${oieError ?? "no data"}`}
          onRetry={() => void refreshOie()}
        />
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Inbox}
          label="OIE Pending"
          value={oieTotal}
          sub="Exam clearances awaiting OIE review"
          accent="text-emerald-400"
          loading={oieLoading && !oieData}
        />
        <StatCard
          icon={UserCheck}
          label="VP Pending"
          value={vpTotal}
          sub="Requests escalated to Vice Principal"
          accent="text-sky-400"
          loading={vpLoading && !vpData}
        />
        <StatCard
          icon={AlertTriangle}
          label="SLA Breached"
          value={oieSlaBreached}
          sub="OIE queue past their 48h SLA deadline"
          accent="text-amber-400"
          loading={oieLoading && !oieData}
        />
        <StatCard
          icon={ShieldCheck}
          label="Total Open"
          value={oieTotal + vpTotal}
          sub="All pending exam-branch approvals"
          accent="text-white"
          loading={(oieLoading && !oieData) || (vpLoading && !vpData)}
        />
      </div>

      {/* queues */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id)} />

      {activeTab === "oie" ? (
        <WidgetBoundary title="OIE Queue">
          {oieData?.data?.length ? (
            <PermissionList
              key="oie-queue"
              workflowType="exam"
              stageFilter="oie"
              title="OIE Queue"
              subtitle="Officer in Examination approval queue"
              initialPermissions={oieData.data as unknown as PermissionItem[]}
            />
          ) : oieLoading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading OIE queue…
            </div>
          ) : (
            <EmptyState message="No pending OIE exam clearances. The queue is clear." />
          )}
        </WidgetBoundary>
      ) : (
        <WidgetBoundary title="VP Queue">
          {vpData?.data?.length ? (
            <PermissionList
              key="vp-queue"
              workflowType="exam"
              stageFilter="vice_principal"
              title="Vice Principal Queue"
              subtitle="Vice Principal examination review queue"
              initialPermissions={vpData.data as unknown as PermissionItem[]}
            />
          ) : vpLoading ? (
            <div className="p-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading VP queue…
            </div>
          ) : (
            <EmptyState message="No pending Vice Principal review items." />
          )}
        </WidgetBoundary>
      )}

      <DevContactStrip />
    </div>
  );
}

export default function ExamPermissionsPage() {
  return (
    <GuardedPage allowedRoles={["exam_branch", "oie", "vice_principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <ExamPermissionsInner />
      </Suspense>
    </GuardedPage>
  );
}
