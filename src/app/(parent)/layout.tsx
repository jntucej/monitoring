"use client";

import React, { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * Parent / guardian console layout — mirrors the OIE / hostel-manager mount
 * pattern. The old KPI cards, KPI grid, charts, engagement/retention panels,
 * ChildStatus/ChildActivity/RequestPassForm and DevContactStrip are dropped.
 *
 * The shell is the RoleConsole: IconRail + a feed Board (child-activity
 * timeline via /api/parents/me, which self-scopes to the caller's linked
 * children) + ChildActivityPanel (the caller's children + their latest
 * activities) + ParentStatusBar + ParentCommandBar (timeline / notifications
 * / fees / records / contact navigation). Scope is the caller's own children
 * only. Sub-pages pass their content through `children`.
 *
 * Parent lives in a `(parent)` route group, not `(approver)` — RoleConsole
 * is role-agnostic so that's fine.
 */
export default function ParentConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard
      allowedRoles={["parent", "guardian", "admin", "sysadmin"] as Role[]}
    >
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="parent" roleRoot="/parent">
            {children}
          </RoleConsole>
        </div>
      </Suspense>
    </AuthGuard>
  );
}
