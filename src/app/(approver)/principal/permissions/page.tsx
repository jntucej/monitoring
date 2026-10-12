"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PermissionList } from "@/components/approver/PermissionList";
import { ClipboardCheck } from "lucide-react";

function PrincipalPermissionsInner() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2 min-w-0">
            <ClipboardCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <span className="min-w-0 truncate">Principal Approvals</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Final-stage exam clearances and hostel requests escalated to you
          </p>
        </div>
      </header>

      {/* exam queue */}
      <PermissionList
        title="Exam Queue — Principal Stage"
        subtitle="Final approval: sign or reject exam clearances"
        workflowType="exam"
        stageFilter="principal"
        fetchUrl="/api/permissions?workflow_type=exam&stage=principal&status=PENDING"
      />

      <DevContactStrip />
    </div>
  );
}

export default function PrincipalPermissionsPage() {
  return (
    <GuardedPage allowedRoles={["principal", "warden", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <PrincipalPermissionsInner />
      </Suspense>
    </GuardedPage>
  );
}
