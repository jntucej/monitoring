"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { SmartSchedulingAssistant } from "@/components/admin/SmartSchedulingAssistant";

export default function SmartSchedulingPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Smart Scheduling Assistant</h1>
          <p className="text-sm text-gray-500">
            AI recommendations based on gate scan telemetry to optimize shift timing and gate throughput.
          </p>
        </div>
        <SmartSchedulingAssistant />
      </div>
    </AuthGuard>
  );
}
