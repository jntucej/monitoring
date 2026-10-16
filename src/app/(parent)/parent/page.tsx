"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";

/**
 * Parent root page — Board-only.
 *
 * The `(parent)` layout already mounts the RoleConsole shell, which renders
 * the feed Board (child-activity timeline via /api/parents/me, self-scoped
 * to the caller's linked children) in the main column plus the
 * ChildActivityPanel, the ParentStatusBar and the ParentCommandBar
 * (timeline / notifications / fees / records / contact). This page renders
 * nothing so the default board fallback is used. No KPI cards, no section
 * links, no retention/engagement widgets, no "Signed in as" toolbar, no
 * DevContactStrip. No horizontal scroll.
 */
export default function ParentPage() {
  return (
    <AuthGuard
      allowedRoles={["parent", "guardian", "admin", "sysadmin"]}
    >
      <Suspense fallback={<PageLoading />}>
        {null}
      </Suspense>
    </AuthGuard>
  );
}
