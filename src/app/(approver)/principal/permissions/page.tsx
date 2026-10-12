"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PermissionList } from "@/components/approver/PermissionList";
import { ClipboardCheck, RefreshCw } from "lucide-react";

function PrincipalPermissionsInner() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2 min-w-0">
            <ClipboardCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <span className="min-w-0 truncate">Principal Approvals</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400 min-w-0">
            Final-stage exam clearances, hostel requests, and institutional approvals escalated to you
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="space-y-8 min-w-0">
        <WidgetBoundary title="Exam Queue — Principal Stage">
          <PermissionList
            title="Exam Queue"
            subtitle="Final approval: sign or reject exam clearances"
            workflowType="exam"
            stageFilter="principal"
            fetchUrl="/api/permissions?workflow_type=exam&stage=principal&status=PENDING"
          />
        </WidgetBoundary>

        <WidgetBoundary title="Hostel & Leave — Principal Stage">
          <PermissionList
            title="Hostel & Leave Requests"
            subtitle="Staff leave and outpass escalated to the principal for final approval"
            workflowType="staff_leave"
            stageFilter="principal"
            fetchUrl="/api/permissions?workflow_type=staff_leave&stage=principal&status=PENDING"
          />
        </WidgetBoundary>

        <WidgetBoundary title="Outpass — Principal Stage">
          <PermissionList
            title="Outpass Requests"
            subtitle="Outpass clearances pending final principal approval"
            workflowType="outpass"
            stageFilter="principal"
            fetchUrl="/api/permissions?workflow_type=outpass&stage=principal&status=PENDING"
          />
        </WidgetBoundary>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function PrincipalPermissionsPage() {
  return (
    <GuardedPage allowedRoles={["principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <PrincipalPermissionsInner />
      </Suspense>
    </GuardedPage>
  );
}
