"use client";
import React from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { PermissionList } from "@/components/approver/PermissionList";

export default function WardenDashboardPage() {
  return (
    <AuthGuard allowedRoles={["warden"]}>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Warden Dashboard</h1>
        {/* KPI Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-card rounded-lg border shadow">Students Out</div>
            <div className="p-4 bg-card rounded-lg border shadow">Overdue</div>
            <div className="p-4 bg-card rounded-lg border shadow">Curfew Alerts</div>
        </div>

        {/* Hostel Permission Approvals */}
        <PermissionList
          title="Hostel Pass Approvals"
          workflowType="hostel"
          currentStage="warden"
          fetchUrl="/api/permissions?workflow_type=hostel&status=PENDING"
        />
      </div>
    </AuthGuard>
  );
}
