"use client";

import React from "react";
import PermissionList from "@/components/approver/PermissionList";

export default function FacultyPermissionsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PermissionList
        workflowType="exam"
        stageFilter="faculty"
        title="Faculty Approvals"
        subtitle="Review initial stage student exam and permission requests"
        allowForward={true}
      />
    </div>
  );
}
