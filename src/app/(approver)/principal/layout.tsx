"use client";

import React from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * Principal console layout — mirrors the oie/supervisor mount pattern.
 *
 * The local sticky tab bar (TABS / section links) is removed. The shell is the
 * RoleConsole: IconRail (5 items) + Board feed (/api/principal/dashboard) +
 * PrincipalDashboardPanel (top-priority items) + ticket ContextPanel +
 * PrincipalStatusBar + PrincipalCommandBar (dashboard / delegations / audit /
 * reports / approvals). Scope is all workflows (top authority role, no
 * hostel/branch filter). Sub-pages pass their content through `children`.
 */
export default function PrincipalConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard
      allowedRoles={["principal", "vice_principal", "admin", "sysadmin"] as Role[]}
    >
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="principal" roleRoot="/principal">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
