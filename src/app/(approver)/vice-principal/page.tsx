"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";

/**
 * Vice Principal root page — Board-only.
 *
 * The layout already mounts the RoleConsole shell, which renders the Board
 * feed (/api/principal/dashboard, itemKey "item") in the main column plus the
 * VpDashboardPanel, PermissionContextPanel, VpStatusBar and VpCommandBar
 * (approvals / delegations / audit / reports / records). This page renders
 * nothing so the default board fallback is used. No KPI cards, no charts, no
 * section links, no retention/engagement widgets, no "Signed in as" toolbar.
 * No horizontal scroll.
 */
export default function VicePrincipalPage() {
  return (
    <AuthGuard
      allowedRoles={["vice_principal", "exam_branch", "oie", "admin", "sysadmin"]}
    >
      <Suspense fallback={<PageLoading />}>
        {null}
      </Suspense>
    </AuthGuard>
  );
}
