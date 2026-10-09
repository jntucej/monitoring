"use client";

import React from "react";
import { PermissionList } from "@/components/approver/PermissionList";

export default function HostelPermissionsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PermissionList
        workflowType="hostel"
        title="Hostel Permissions"
        subtitle="Manage and approve student hostel outpass & leave requests"
      />
    </div>
  );
}
