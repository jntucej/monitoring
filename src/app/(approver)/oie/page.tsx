"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";

/**
 * OIE root page — Board-only.
 *
 * The layout already mounts the RoleConsole shell, which renders the
 * KanbanBoard (exam permissions filtered to workflow_type=exam, via
 * /api/oie/queue) in the main column plus the ExamDayPanel, the permission
 * ContextPanel, OieStatusBar and OieCommandBar. This page renders nothing so
 * the default board fallback is used. No KPI cards, no section links, no
 * retention/engagement widgets, no "Signed in as" toolbar. No horizontal
 * scroll.
 */
export default function OiePage() {
  return (
    <AuthGuard
      allowedRoles={["oie", "exam_superintendent", "principal", "admin", "sysadmin"]}
    >
      <Suspense fallback={<PageLoading />}>
        {null}
      </Suspense>
    </AuthGuard>
  );
}
