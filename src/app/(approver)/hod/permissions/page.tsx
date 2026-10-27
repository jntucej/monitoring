"use client";


import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PermissionList } from "@/components/approver/PermissionList";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";

function HodPermissionsInner() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400">
            Department exam and memo permissions at HOD stage
          </p>
        </div>
      </div>

      <PermissionList
        title="Exam — HOD Stage"
        subtitle="Review department exam clearances"
        workflowType="exam"
        stageFilter="hod"
        fetchUrl="/api/permissions?workflow_type=exam&stage=hod&status=PENDING"
      />

      <PermissionList
        title="Memo — HOD Stage"
        subtitle="Review memo requests"
        workflowType="memo"
        stageFilter="hod"
        fetchUrl="/api/permissions?workflow_type=memo&stage=hod&status=PENDING"
      />

      <DevContactStrip />
    </div>
  );
}
export default function HodPermissionsPage() {
  return (
    <AuthGuard allowedRoles={['hod', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <HodPermissionsInner />
      </Suspense>
    </AuthGuard>
  );
}
