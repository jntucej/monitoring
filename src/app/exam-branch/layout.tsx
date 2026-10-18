"use client";

import React from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * Exam Branch console layout — mirrors the OIE exam-desk mount pattern.
 *
 * AuthGuard + Suspense → the RoleConsole shell (IconRail + KanbanBoard
 * self-scoped to the caller's own branch via /api/permissions
 * ?workflow_type=exam&branch=:self + permission ContextPanel +
 * ExamBranchStatusBar + ExamBranchCommandBar + the HandoffPanel extra panel).
 *
 * The local tab bar (TABS / ExamBranchTabs) and the KPI cards / charts /
 * retention panels have been dropped — the RoleConsole shell owns the entire
 * surface. Sub-pages pass their content through `children`.
 */
export default function ExamBranchConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard
      allowedRoles={["exam_branch", "oie", "vice_principal", "principal", "admin", "sysadmin"] as Role[]}
    >
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="exam_branch" roleRoot="/exam-branch">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
