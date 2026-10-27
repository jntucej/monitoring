<<<<<<< HEAD
export const dynamic = "force-dynamic";

// src/app/(sysadmin)/sysadmin/scheduling/page.tsx
// SCAFFOLD:RICH-PAGE — thin wrapper; the (sysadmin) layout owns the shell.
import { Suspense } from "react";
import { GuardedPage } from "@/components/shared/GuardedPage";
import { SchedulingPanel } from "@/components/sysadmin/SchedulingPanel";
import Loading from "./loading";
=======
"use client";
>>>>>>> 8083ee407bab2659673d477f46b4a98d66726c31

import { AuthGuard } from "@/components/shared/AuthGuard";
import { SmartSchedulingAssistant } from "@/components/admin/SmartSchedulingAssistant";

export default function SmartSchedulingPage() {
  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
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
