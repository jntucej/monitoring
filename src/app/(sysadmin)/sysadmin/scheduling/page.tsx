"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { SmartSchedulingAssistant } from "@/components/admin/SmartSchedulingAssistant";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";

export default function SmartSchedulingPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <ContextSituationBar
        roleLabel="System Admin"
        purpose="Manage and monitor scheduling for campus operations."
        contextLabel="Scheduling"
        statusSummary="Review current scheduling state and take action below."
        primaryAction={{ label: "SysAdmin Overview", href: "/sysadmin" }}
        secondaryAction={{ label: "System Health", href: "/sysadmin/health" }}
      />
        <div>
          <p className="text-2xl font-bold tracking-tight">AI Smart Scheduling Assistant</p>
          <p className="text-sm text-muted">
            AI recommendations based on gate scan telemetry to optimize shift timing and gate throughput.
          </p>
        </div>
        <SmartSchedulingAssistant />
      </div>
    </AuthGuard>
  );
}
