"use client";

import React from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * Hostel Manager console layout — mirrors the deputy-warden/caretaker mount
 * pattern.
 *
 * The local sticky tab bar (TABS / HostelManagerTabs) is removed. The shell is
 * the RoleConsole: IconRail + KanbanBoard (hostel tickets at the
 * hostel_manager stage, scoped by hostel_scope) + ticket ContextPanel +
 * HostelManagerStatusBar + HostelManagerCommandBar (assign / resolve /
 * allocate / escalate / view-residents), plus the AllocationPanel (room-bed
 * drag-drop) as an extra panel in the main column. Sub-pages pass their
 * content through `children`.
 */
export default function HostelManagerConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["hostel_manager", "principal", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="hostel_manager" roleRoot="/hostel-manager">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
