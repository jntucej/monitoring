"use client";

import React from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * Deputy Warden console layout — mirrors the caretaker/staff mount pattern.
 *
 * The local sticky tab bar (TABS / DeputyWardenTabs) is removed. The shell is
 * the RoleConsole: IconRail + KanbanBoard (hostel permissions at the
 * deputy_warden stage, grouped by status) + PermissionContextPanel +
 * PermissionStatusBar + DeputyWardenCommandBar (approve/reject/forward/
 * escalate/delegate). Sub-pages pass their content through `children`.
 */
export default function DeputyWardenConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["deputy_warden", "hostel_manager", "principal", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="deputy_warden" roleRoot="/deputy-warden">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
