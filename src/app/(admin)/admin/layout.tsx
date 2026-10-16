"use client";

import React, { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * Admin console layout — mirrors the oie/supervisor/sysadmin mount pattern.
 *
 * The local KPI cards / campus dashboard / gate-charts chrome is dropped from
 * the root page. The shell is the RoleConsole: IconRail (5 nav items: alerts,
 * announcements, audit, backup, reports) + a Board feed from /api/admin/alerts
 * (the open-alerts feed, itemKey "alert") + the AdminAlertsPanel (open
 * alerts list) as an extra panel in the main column + AdminStatusBar
 * ("Admin: N active alerts · M pending · K records") + AdminCommandBar
 * (alerts / announcements / audit / backup / reports, each a free-text
 * navigation command to the real admin sub-page). Sub-pages pass their
 * content through `children`.
 */
export default function AdminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="admin" roleRoot="/admin">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
