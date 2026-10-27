"use client";

import React from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * Vice Principal console layout — mirrors the oie/supervisor mount pattern.
 *
 * The local 9-tab sticky nav is removed. The shell is the RoleConsole:
 * IconRail + Board feed (/api/principal/dashboard, itemKey "item") +
 * PermissionContextPanel + VpStatusBar + VpCommandBar (approvals /
 * delegations / audit / reports / records — all pure navigation to the real
 * VP sub-pages), plus the VpDashboardPanel (top-priority alerts + pending
 * counts) as an extra panel in the main column. VP scope = delegated
 * oversight; no hostel/branch filter. Sub-pages pass their content through
 * `children`.
 */
export default function VicePrincipalConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard
      allowedRoles={["vice_principal", "exam_branch", "oie", "admin", "sysadmin"] as Role[]}
    >
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="vice_principal" roleRoot="/vice-principal">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
