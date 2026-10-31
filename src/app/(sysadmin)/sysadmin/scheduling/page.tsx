"use client";

import { AuthGuard } from "@/components/shared/AuthGuard";
import { SmartSchedulingAssistant } from "@/components/admin/SmartSchedulingAssistant";

export default function SmartSchedulingPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <p className="text-2xl font-bold tracking-tight">AI Smart Scheduling Assistant</p>
          <p className="text-sm text-gray-500">
            AI recommendations based on gate scan telemetry to optimize shift timing and gate throughput.
          </p>
        </div>
        <SmartSchedulingAssistant />
      </div>
    </AuthGuard>
  );
}
