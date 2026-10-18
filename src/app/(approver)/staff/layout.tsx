"use client";

import React from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * Staff console layout — mirrors the HOD mount pattern.
 *
 * The local tab bar (TABS / StaffTabs) is removed. The shell is the
 * RoleConsole: IconRail + Board feed (my-day) + ContextPanel + StatusBar +
 * CommandBar. Sub-pages pass their content through `children`; the root
 * page returns null so the default Board feed shows.
 */
export default function StaffTabbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["staff", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="staff" roleRoot="/staff">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
