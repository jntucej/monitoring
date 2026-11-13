"use client";

import { Suspense, useCallback, useMemo } from "react";
import Link from "next/link";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";

import {
  Loader2,
  AlertTriangle,
  ArrowRight,
  Gavel,
  Inbox,
  UserCheck,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PermissionList } from "@/components/approver/PermissionList";

/* response shapes */












interface PermissionRequestRow {
  id: string;
  ticket_number: string;
  workflow_type: string;
  current_stage: string;
  status: string;
  sla_deadline?: string | null;
  student?: { name: string; student_details?: { roll?: string } | null } | null;
}

interface PermissionsResponse {
  success: boolean;
  data: PermissionRequestRow[];
  total?: number;
}

interface DelegationStatusResponse {
  success: boolean;
  data: { active: boolean; scopes: string[]; delegatedBy?: string; note?: string };
}

/* building blocks */

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
    <div className="rounded-xl border border-border bg-bg-base p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 text-text-muted min-w-0">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide truncate">{label}</span>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none text-text-muted" />
      ) : (
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      )}
      {sub && <p className="text-xs text-text-muted min-w-0">{sub}</p>}
    </div>
  );
}

function DelegationBadge({ active, loading }: { active: boolean; loading: boolean }) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-text-muted">
        <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" /> Checking delegation…
      </span>
    );
  }
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-action-success">
      <Gavel className="w-3 h-3" /> Within delegated scope — approval actions enabled
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-bg-elevated/30 px-2.5 py-1 text-xs font-semibold text-text-secondary">
      <Gavel className="w-3 h-3" /> Read-only — no delegation data recorded yet
    </span>
  );
}

/* main content */

function DeputyWardenDelegatedApprovalsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "deputy_warden") as Role;
  const tier = getRoleTier(role);

  const {
    data,
    loading,
    error,
    refresh,
  } = useApiResource<PermissionsResponse>(
    "/api/permissions?workflow_type=hostel&status=PENDING&stage=deputy_warden",
    { ttlMs: 30_000 }
  );
  const {
    data: delegation,
    loading: delegationLoading,
    refresh: refreshDelegation,
  } = useApiResource<DelegationStatusResponse>("/api/deputy-warden/delegation", {
    ttlMs: 30_000,
  });

  const refreshAll = useCallback(async () => {
    clearCache();
    await Promise.all([refresh(), refreshDelegation()]);
  }, [refresh, refreshDelegation]);

  usePolling(refreshAll, { intervalMs: 30_000, enabled: !!user });

  const busy = (loading && !data) || (delegationLoading && !delegation);
  const delegationActive = Boolean(delegation?.data?.active);
  const rows = data?.data ?? [];
  const total = data?.total ?? rows.length;

  const slaBreached = useMemo(
    () =>
      rows.filter((r) => {
        if (!r.sla_deadline) return false;
        const ts = new Date(r.sla_deadline).getTime();
        return !Number.isNaN(ts) && ts < Date.now();
      }).length,
    [rows]
  );

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 overflow-x-hidden space-y-6 px-4 py-6 md:px-6">
      {/* Back link */}
      <Link
        href="/deputy-warden/daily-overview"
        className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <ArrowRight className="w-3 h-3 rotate-180" /> Back to Daily Overview
      </Link>

      {/* Page toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-text-muted min-w-0">
            Signed in as <span className="font-mono text-text-secondary">{role}</span> · tier {tier}
            {user?.name ? ` · ${user.name}` : ""}
          </p>
          <p className="text-xs text-text-muted mt-1 min-w-0">
            Authority: the deputy warden acts only within the explicit delegation or standing policy
            scope of the principal/warden. Delegation data drives the badge below.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-action-warning flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="truncate">Approvals data unavailable: {error}</span>
          </span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-amber-500/40 px-3 py-1 text-xs font-semibold hover:bg-amber-500/20 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI row */}
      <WidgetBoundary title="Delegated Approvals">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
          <StatCard
            icon={Inbox}
            label="Pending at Warden Stage"
            value={total}
            sub="Hostel / outpass requests awaiting principal review"
            accent="text-action-warning"
            loading={loading && !data}
          />
          <StatCard
            icon={AlertTriangle}
            label="SLA Breached"
            value={slaBreached}
            sub="Requests past their 48h deadline"
            accent="text-action-danger"
            loading={loading && !data}
          />
          <StatCard
            icon={UserCheck}
            label="Delegation"
            value={delegationActive ? "Active" : "Not recorded"}
            sub={
              delegationActive
                ? "Approval actions enabled within delegated scope"
                : "No delegation data — this view is read-only"
            }
            accent={delegationActive ? "text-action-success" : "text-text-secondary"}
            loading={delegationLoading && !delegation}
          />
        </div>
      </WidgetBoundary>

      {/* Delegation status banner */}
      <div className="rounded-xl border border-border bg-bg-base p-4 flex flex-wrap items-center gap-3 min-w-0">
        <DelegationBadge active={delegationActive} loading={delegationLoading && !delegation} />
        <p className="text-xs text-text-muted min-w-0">
          {delegation?.data?.note ??
            "Delegation data is read from the principal/warden policy ledger; until a delegation is recorded, decisions here are logged as review notes and escalated to the warden stage."}
        </p>
      </div>

      {/* Queue — actionable when delegation is recorded; the shared
          PermissionList carries per-row Approve / Reject / Forward (1.13). */}
      {busy ? (
        <WidgetBoundary title="Approval Queue">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
            <div className="p-4 flex items-center gap-2 text-sm text-text-muted min-w-0">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none shrink-0" />{" "}
              Loading delegated-approval queue…
            </div>
          </div>
        </WidgetBoundary>
      ) : rows.length === 0 ? (
        <WidgetBoundary title="Approval Queue">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
            <div className="p-6 text-center min-w-0">
              <Inbox className="w-6 h-6 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">
                No pending items at the deputy-warden stage. The queue is clear.
              </p>
            </div>
          </div>
        </WidgetBoundary>
      ) : (
        <WidgetBoundary title="Approval Queue">
          <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 md:px-6 min-w-0">
            <PermissionList
              title="Delegated approval queue"
              subtitle="Act within the recorded delegation scope; forward anything outside it to the warden stage."
              workflowType="hostel"
              currentStage="deputy_warden"
              fetchUrl="/api/permissions?workflow_type=hostel&status=PENDING&stage=deputy_warden"
              allowForward
            />
          </div>
        </WidgetBoundary>
      )}

    </div>
  );
}
export default function DeputyWardenDelegatedApprovalsPage() {
  return (
    <AuthGuard allowedRoles={['deputy_warden', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <DeputyWardenDelegatedApprovalsInner />
      </Suspense>
    </AuthGuard>
  );
}
