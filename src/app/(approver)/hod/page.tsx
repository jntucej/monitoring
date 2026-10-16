"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";

/**
 * HOD root page — board-only.
 *
 * The RoleConsole shell (IconRail + Kanban/Board main column + ContextPanel +
 * StatusBar + CommandBar) is provided by the HOD layout. This page
 * contributes no extra content, so the default Board / Kanban fallback shows
 * through. Mirrors the operator root page, which also just returns `null`.
 */
export default function HodDashboardPage() {
  return (
    <AuthGuard allowedRoles={["hod", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        null
      </Suspense>
    </AuthGuard>
  );
}
