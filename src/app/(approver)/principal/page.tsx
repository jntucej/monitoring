"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";

/**
 * Principal root page — Board-only.
 *
 * The layout already mounts the RoleConsole shell, which renders the Board
 * feed (/api/principal/dashboard) in the main column plus the
 * PrincipalDashboardPanel, the ticket ContextPanel, PrincipalStatusBar and
 * PrincipalCommandBar. This page renders nothing so the default board fallback
 * is used. No KPI cards, no charts, no tab scroll.
 */
export default function PrincipalPage() {
  return (
    <AuthGuard
      allowedRoles={["principal", "vice_principal", "admin", "sysadmin"]}
    >
      <Suspense fallback={<PageLoading />}>
        {null}
      </Suspense>
    </AuthGuard>
  );
}
