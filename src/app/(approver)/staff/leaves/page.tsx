"use client";


import React from "react";
import { Suspense } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PageLoading } from "@/components/shared/LoadingStates";

import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { PermissionList } from "@/components/approver/PermissionList";

function StaffLeavesInner() {
  return (
    <div className="p-4 sm:p-6 md:p-4 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <ContextSituationBar
        roleLabel="Campus Staff"
        purpose="Submit, approve, or track teaching and non-teaching staff leave applications."
        why="Formal leave applications ensure administrative staffing cover and maintain institutional attendance compliance."
        contextLabel="Leave Permission Management"
        statusTone="info"
        statusSummary="Manage staff leave submissions, track multi-level approvals, and review leave records."
        primaryAction={{ label: "Request Status", href: "/staff/request-status" }}
        secondaryAction={{ label: "My Day", href: "/staff/my-day" }}
      />
      <WidgetBoundary title="Staff Leave Requests">
        <PermissionList
          workflowType="staff_leave"
          title="Staff Leave Requests"
          subtitle="Manage teaching and non-teaching staff leave permissions"
        />
      </WidgetBoundary>

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
