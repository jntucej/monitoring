"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";

/**
 * Exam Branch root page — Board-only.
 *
 * The layout already mounts the RoleConsole shell, which renders the
 * KanbanBoard (exam permissions self-scoped to the caller's own branch via
 * /api/permissions?workflow_type=exam&branch=:self) in the main column plus
 * the HandoffPanel, the permission ContextPanel, ExamBranchStatusBar and
 * ExamBranchCommandBar. This page renders nothing so the default board
 * fallback is used. No KPI cards, no charts, no retention/engagement
 * widgets, no tab scroll. No horizontal scroll.
 */
export default function ExamBranchPage() {
  return (
    <AuthGuard
      allowedRoles={["exam_branch", "oie", "vice_principal", "principal", "admin", "sysadmin"]}
    >
      <Suspense fallback={<PageLoading />}>
        {null}
      </Suspense>
    </AuthGuard>
  );
}
