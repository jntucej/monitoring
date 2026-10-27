"use client";

import React from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * Supervisor console layout — mirrors the oie mount pattern.
 *
 * The local sticky tab bar is removed. The shell is the RoleConsole:
 * IconRail + Board feed (escalation feed from /api/supervisor/escalations,
 * scoped to the caller's supervised_gates) + permission ContextPanel
 * + SupervisorStatusBar (N gates · M escalations · K incidents · shift)
 * + SupervisorCommandBar (approve / escalate / assign / resolve / handover),
 * plus the EscalationPanel as an extra panel in the main column.
 * Sub-pages pass their content through `children`.
 */
export default function SupervisorConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard
      allowedRoles={["supervisor", "admin", "sysadmin", "principal"] as Role[]}
    >
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="supervisor" roleRoot="/supervisor">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
