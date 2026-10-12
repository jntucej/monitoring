"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PermissionList } from "@/components/approver/PermissionList";
import { ClipboardCheck } from "lucide-react";

function FacultyPermissionsInner() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 min-w-0">
      {/* Page toolbar — global DynamicHeader already renders the app header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2 min-w-0">
            <ClipboardCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <span className="min-w-0 truncate">Faculty & HOD Approvals</span>
          </h1>
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
    <Suspense fallback={<PageLoading />}>
      <FacultyPermissionsInner />
    </Suspense>
  );
}
