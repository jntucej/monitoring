"use client";

import React from "react";
import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PermissionList } from "@/components/approver/PermissionList";

function StaffLeavesInner() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <WidgetBoundary title="Staff Leave Requests">
        <PermissionList
          workflowType="staff_leave"
          title="Staff Leave Requests"
          subtitle="Manage teaching and non-teaching staff leave permissions"
        />
      </WidgetBoundary>
      <DevContactStrip />
    </div>
  );
}
export default function StaffLeavesPage() {
  return (
    <AuthGuard allowedRoles={['staff', 'admin', 'sysadmin']}>
      <Suspense fallback={<PageLoading />}>
        <StaffLeavesInner />
      </Suspense>
    </AuthGuard>
  );
}
