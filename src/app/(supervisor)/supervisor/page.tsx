"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";

/**
 * Supervisor root page — Board-only.
 *
 * The layout already mounts the RoleConsole shell, which renders the
 * escalation Board feed in the main column plus the LiveActivityPanel,
 * the escalation ContextPanel, SupervisorStatusBar, and SupervisorCommandBar.
 * This page renders nothing so the default board fallback is used. No KPI
 * cards, no section links, no retention/engagement widgets. No horizontal
 * scroll.
 */
export default function SupervisorPage() {
  return (
    <AuthGuard
      allowedRoles={["supervisor", "admin", "sysadmin", "principal"] as Role[]}
    >
      <Suspense fallback={<PageLoading />}>
        {null}
      </Suspense>
    </AuthGuard>
  );
}
