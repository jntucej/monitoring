"use client";

import React from "react";
import { Suspense } from "react";
import { OperatorPageLoading } from "@/components/operator/shared/OperatorLoading";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * Worker console layout — mirrors the OIE / staff mount pattern.
 *
 * The shell is the RoleConsole: IconRail + digest Board (worker's own
 * /api/workers/my-work: tasks / completedLastWeek / todayShift) +
 * MyWorkPanel (open work items) + WorkerStatusBar + WorkerCommandBar
 * (my-work / shifts / work-orders / history / records). The root page
 * returns null so the default board fallback shows. Sub-pages (if any are
 * added later) pass their content through `children`.
 */
export default function WorkerConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard
      allowedRoles={["worker", "admin", "sysadmin", "supervisor"] as Role[]}
    >
      <Suspense fallback={<OperatorPageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="worker" roleRoot="/worker">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
