"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import type { Role } from "@/lib/types";

/**
 * Mess In-charge root page — Board-only.
 *
 * The layout already mounts the RoleConsole shell, which renders the feed
 * board (the mess schedule, driven by /api/mess/days with itemKey "day") in
 * the main column plus the TodayMealsPanel, the ticket ContextPanel,
 * MessInchargeStatusBar and MessInchargeCommandBar. This page renders nothing
 * so the default board fallback is used. No KPI cards, no charts, no section
 * links, no local tab bar. No horizontal scroll.
 */
const MESS_ALLOWED_ROLES: Role[] = [
  "mess_incharge",
  "principal",
  "admin",
  "sysadmin",
];

export default function MessPage() {
  return (
    <AuthGuard allowedRoles={MESS_ALLOWED_ROLES}>
      <Suspense fallback={<PageLoading />}>
        {null}
      </Suspense>
    </AuthGuard>
  );
}
