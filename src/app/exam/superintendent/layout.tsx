"use client";

import React from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * Exam superintendent console layout — mirrors the oie mount pattern.
 *
 * The local sticky tab bar / KPI cards / charts are removed. The shell is the
 * RoleConsole: IconRail + KanbanBoard (via /api/exam/access, columns
 * PENDING/ACTIVE/CLOSED) + permission ContextPanel +
 * ExamSuperintendentStatusBar + ExamSuperintendentCommandBar, plus the
 * IncidentPanel (exam-day access exceptions) as an extra panel in the main
 * column. Sub-pages pass their content through `children`.
 */
export default function ExamSuperintendentConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard
      allowedRoles={[
        "exam_superintendent",
        "exam_branch",
        "oie",
        "vice_principal",
        "principal",
        "admin",
        "sysadmin",
      ] as Role[]}
    >
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="exam_superintendent" roleRoot="/exam/superintendent">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
