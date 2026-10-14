"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PermissionList } from "@/components/approver/PermissionList";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";

function FacultyPermissionsInner() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Page toolbar — global DynamicHeader already renders the app header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="mt-1 text-sm text-slate-400">
            Initial-stage exam clearances and memo requests
          </p>
        </div>
      </div>

      <PermissionList
        title="Exam — Faculty / HOD Stage"
        subtitle="Review initial-stage exam clearances"
        workflowType="exam"
        stageFilter="faculty"
        fetchUrl="/api/permissions?workflow_type=exam&stage=faculty&status=PENDING"
        allowForward={true}
      />

      <PermissionList
        title="Memo — HOD Stage"
        subtitle="Review memo requests at HOD stage"
        workflowType="memo"
        stageFilter="hod"
        fetchUrl="/api/permissions?workflow_type=memo&stage=hod&status=PENDING"
      />

      <DevContactStrip />
    </div>
  );
}
export default function FacultyPermissionsPage() {
  return (
    <AuthGuard allowedRoles={['faculty', 'hod', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <FacultyPermissionsInner />
      </Suspense>
    </AuthGuard>
  );
}
