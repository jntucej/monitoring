"use client";

// 1.13 — the deputy warden is L2 in the hostel chain: the outpass queue must be
// actionable, not a read-only feed. Mount the shared PermissionList (which has
// per-row Approve / Reject / Forward wired to PATCH /api/permissions/<ticket>)
// instead of the static table.

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PermissionList } from "@/components/approver/PermissionList";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";

function DeputyWardenOutpassInner() {
  return (
    <WidgetBoundary title="Outpass">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 md:px-6 min-w-0">
        <PermissionList
          title="Outpass queue"
          subtitle="Hostel out-passes at the deputy-warden stage. Approve, reject, or forward to hostel management."
          workflowType="hostel"
          currentStage="deputy_warden"
          fetchUrl="/api/permissions?workflow_type=hostel&status=PENDING&stage=deputy_warden"
          allowForward
        />
      </div>
    </WidgetBoundary>
  );
}

export default function DeputyWardenOutpassPage() {
  return (
    <AuthGuard allowedRoles={["deputy_warden", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <DeputyWardenOutpassInner />
      </Suspense>
    </AuthGuard>
  );
}
