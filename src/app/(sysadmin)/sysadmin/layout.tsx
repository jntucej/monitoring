"use client";

import React from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * SysAdmin console layout — mirrors the oie/supervisor mount pattern.
 *
 * The local sticky sidebar / KPI card / chart chrome is removed. The shell is
 * the RoleConsole: IconRail (5 nav items) + Board feed (application-health
 * from /api/sysadmin/application-health) + ticket ContextPanel +
 * SysadminStatusBar + SysadminCommandBar (health / services / deployments /
 * backup / audit), plus the SysadminHealthPanel (service health rows) as an
 * extra panel in the main column. Sub-pages pass their content through
 * `children`.
 */
export default function SysadminConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard
      allowedRoles={["sysadmin", "admin"] as Role[]}
    >
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="sysadmin" roleRoot="/sysadmin">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
