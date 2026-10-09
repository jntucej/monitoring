"use client";

import React from "react";
import { PermissionList } from "@/components/approver/PermissionList";

export default function PrincipalPermissionsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PermissionList
        workflowType="hostel"
        stageFilter="warden_or_principal"
        title="Principal / Warden Approvals"
        subtitle="Review escalated and final-stage student permissions"
      />
    </div>
  );
}
