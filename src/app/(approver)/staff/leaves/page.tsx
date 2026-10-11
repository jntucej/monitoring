"use client";

import React from "react";
import { PermissionList } from "@/components/approver/PermissionList";

export default function StaffLeavesPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PermissionList
        workflowType="staff_leave"
        title="Staff Leave Requests"
        subtitle="Manage teaching and non-teaching staff leave permissions"
      />
    </div>
  );
}
