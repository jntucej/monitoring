"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";

/**
 * Staff console root — Board-only.
 *
 * The layout mounts the RoleConsole shell (IconRail + feed + StatusBar +
 * CommandBar). The root page renders nothing so the default my-day feed
 * (from /api/staff/my-day) shows in the main column. All KPI cards, charts,
 * section quick-links, retention/engagement widgets, and the "Signed in as"
 * toolbar have been removed to keep the console lean.
 *
 * Sub-pages (my-day, duties, leaves, history, ...) are reachable via the
 * IconRail flyout + CommandBar, not a top scroll tab.
 */
export default function StaffPage() {
  return (
    <AuthGuard allowedRoles={["staff", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        {null}
      </Suspense>
    </AuthGuard>
  );
}
