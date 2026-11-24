"use client";

// 1.13 — leave requests are actionable at the deputy-warden stage (they're the
// hostel L2 link): mount the shared PermissionList instead of the read-only table.

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { PermissionList } from "@/components/approver/PermissionList";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";

function DeputyWardenLeaveInner() {
  return (
    <WidgetBoundary title="Leave">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 md:px-6 min-w-0">
        <ContextSituationBar
          roleLabel="Deputy Warden"
          purpose="Review and adjudicate extended hostel leave applications, verify parent consent, and record leave approvals"
          contextLabel="Hostel Leave Requests Review"
          statusSummary="Process resident leave and vacation requests awaiting hostel level-2 review and forward decisions."
          severity="info"
          primaryAction={{ label: "Outpass Queue", href: "/deputy-warden" }}
          secondaryActions={[
            { label: "Delegated Approvals", href: "/deputy-warden/delegated-approvals" },
            { label: "Daily Overview", href: "/deputy-warden/daily-overview" },
          ]}
        />
        <PermissionList
          title="Leave requests"
          subtitle="Pending leave requests awaiting the deputy-warden review."
          workflowType="hostel"
          currentStage="deputy_warden"
          fetchUrl="/api/permissions?workflow_type=hostel&status=PENDING&stage=deputy_warden"
          allowForward
        />
      </div>
    </WidgetBoundary>
  );
}

export default function DeputyWardenLeavePage() {
  return (
    <AuthGuard allowedRoles={["deputy_warden", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <DeputyWardenLeaveInner />
      </Suspense>
    </AuthGuard>
  );
}
