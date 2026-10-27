"use client";

import React from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * OIE exam-desk console layout — mirrors the hostel-manager/deputy-warden
 * mount pattern.
 *
 * The local sticky tab bar (TABS / OieTabs) is removed. The shell is the
 * RoleConsole: IconRail + KanbanBoard (exam permissions filtered to
 * workflow_type=exam, via /api/oie/queue) + permission ContextPanel +
 * OieStatusBar + OieCommandBar (approve / reject / forward / day-access /
 * exceptions), plus the ExamDayPanel (exam-day gate access) as an extra panel
 * in the main column. Scope is exam workflows only. Sub-pages pass their
 * content through `children`.
 */
export default function OieConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard
      allowedRoles={["oie", "exam_superintendent", "principal", "admin", "sysadmin"] as Role[]}
    >
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="oie" roleRoot="/oie">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
