"use client";

import React from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * Caretaker console layout — mirrors the HOD/staff mount pattern.
 *
 * The local sticky tab bar (TABS / CaretakerTabs) is removed. The shell is
 * the RoleConsole: IconRail + Grid board (caretaker summary, grouped by
 * status) + ContextPanel + CaretakerStatusBar + caretaker CommandBar.
 * Sub-pages pass their content through `children`; the root page renders a
 * GridBoard of the caretaker summary grouped by status.
 */
export default function CaretakerConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["caretaker", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="caretaker" roleRoot="/caretaker">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
