"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";

/**
 * Exam superintendent root page — Board-only.
 *
 * The layout already mounts the RoleConsole shell, which renders the
 * KanbanBoard (via /api/exam/access, columns PENDING/ACTIVE/CLOSED) in the
 * main column plus the IncidentPanel, the permission ContextPanel,
 * ExamSuperintendentStatusBar and ExamSuperintendentCommandBar. This page
 * renders nothing so the default board fallback is used. No KPI cards, no
 * section links, no retention/engagement widgets, no "Signed in as" toolbar.
 * No horizontal scroll.
 */
export default function ExamSuperintendentPage() {
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
      ]}
    >
      <Suspense fallback={<PageLoading />}>
        {null}
      </Suspense>
    </AuthGuard>
  );
}
