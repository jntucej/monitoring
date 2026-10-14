"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PermissionList } from "@/components/approver/PermissionList";
import { useAuthStore } from "@/stores/authStore";
import { getRoleTier } from "@/lib/alert-hierarchy";
import type { Role } from "@/lib/types";
import { usePolling } from "@/hooks/usePolling";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { clearCache } from "@/hooks/useApiResource";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
} from "lucide-react";
import { useCallback, useState } from "react";

function ApprovalsInner() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "principal") as Role;
  const tier = getRoleTier(role);

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    clearCache("/api/permissions?workflow_type=exam&stage=principal&status=PENDING");
    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  usePolling(refresh, { intervalMs: 30_000, enabled: !!user });

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
            Signed in as <span className="font-mono">{role}</span> · tier {tier}
            {lastRefresh && (
              <span className="ml-2">· last refresh {new Date(lastRefresh).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </p>
        </div>
      </div>

      <WidgetBoundary title="Approvals and Decisions">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5 min-w-0">
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
            <Users className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Approvals &amp; Decisions — Principal Stage
            </span>
          </div>
          <PermissionList
            title="Pending Approvals"
            workflowType="exam"
            currentStage="principal"
            fetchUrl="/api/permissions?workflow_type=exam&stage=principal&status=PENDING"
            allowForward={false}
          />
        </div>
      </WidgetBoundary>

      <DevContactStrip />
    </div>
  );
}

export default function PrincipalApprovalsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ApprovalsInner />
    </Suspense>
  );
}
