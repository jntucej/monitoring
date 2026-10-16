"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";

/**
 * Hostel Manager root page — Board-only.
 *
 * The layout already mounts the RoleConsole shell, which renders the
 * KanbanBoard (hostel tickets at the hostel_manager stage, scoped by
 * hostel_scope) in the main column plus the AllocationPanel (room-bed
 * drag-drop), the ticket ContextPanel, HostelManagerStatusBar and
 * HostelManagerCommandBar. This page renders nothing so the default board
 * fallback is used. No KPI cards, no section links, no retention/engagement
 * widgets, no "Signed in as" toolbar. No horizontal scroll.
 */
export default function HostelManagerPage() {
  return (
    <AuthGuard allowedRoles={["hostel_manager", "principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        {null}
      </Suspense>
    </AuthGuard>
  );
}
