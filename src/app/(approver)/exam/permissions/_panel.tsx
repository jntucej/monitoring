"use client";

import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { PermissionList } from "@/components/approver/PermissionList";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import {
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Loader2,
  Inbox,
} from "lucide-react";

export type ExamQueue = "oie" | "vice_principal";

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

export function ExamPermissionsPanel({ queue }: { queue: ExamQueue }) {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "exam_branch") as Role;
  const tier = getRoleTier(role);

  const isExamBranchRole = role === "exam_branch";

  const {
    data: oieData,
    loading: oieLoading,
    refresh: refreshOie,
  } = useApiResource<PermissionsResponse>(
    isExamBranchRole
      ? "/api/permissions?workflow_type=exam&status=PENDING&stage=oie"
      : "/api/permissions?workflow_type=exam&status=PENDING",
    { ttlMs: 30_000 },
  );

  const {
    data: vpData,
    loading: vpLoading,
    refresh: refreshVp,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflow_type=exam&status=PENDING&stage=vice_principal",
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
        </div>
      </div>

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

      {/* Queue */}
      {queue === "oie" ? (
        <WidgetBoundary title="OIE Queue">
          {oieData?.data?.length ? (
            <PermissionList
              key="oie-queue"
              workflowType="exam"
              stageFilter="oie"
              title="OIE Queue"
              subtitle="Officer in Examination approval queue"
              initialPermissions={oieData.data as any}
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
              initialPermissions={vpData.data as any}
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
