"use client";

import React from "react";
import { PermissionList } from "@/components/approver/PermissionList";

export default function HodPermissionsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PermissionList
        workflowType="exam"
        stageFilter="hod"
        title="HOD Approvals"
        subtitle="Review department exam permissions and student requests"
      />
    </div>
  );
}
