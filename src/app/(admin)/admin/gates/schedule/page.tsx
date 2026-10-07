"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { GateSchedule } from "@/components/admin/GateSchedule";

export default function GateSchedulePage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <GateSchedule />
      </div>
    </AuthGuard>
  );
}
