"use client";

import React from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * Guardian console layout — mirrors the principal/supervisor mount pattern.
 *
 * The legacy sticky tab bar (TABS / GuardianTabbedNav) is replaced by the
 * RoleConsole shell: IconRail + Board feed (/api/parents/me, self-scoped to
 * the caller's own linked children) + ticket ContextPanel + ParentStatusBar +
 * ParentCommandBar. Sub-pages pass their content through `children`.
 */
export default function GuardianConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard
      allowedRoles={["guardian", "parent", "admin", "sysadmin"] as Role[]}
    >
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="guardian" roleRoot="/guardian">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
