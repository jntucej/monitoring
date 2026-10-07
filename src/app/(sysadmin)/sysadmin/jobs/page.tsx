"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { ScheduledJobs } from "@/components/sysadmin/ScheduledJobs";

export default function JobsPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <ScheduledJobs />
      </div>
    </AuthGuard>
  );
}
