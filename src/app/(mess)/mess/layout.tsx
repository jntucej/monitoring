"use client";

import React from "react";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleConsole } from "@/components/shared/RoleConsole";
import type { Role } from "@/lib/types";

/**
 * Mess In-charge console layout — mirrors the oie/supervisor mount pattern.
 *
 * The local sticky tab bar (MessLayout / TABS) + KPI cards are dropped. The
 * shell is the RoleConsole: IconRail + digest board (the per-day mess
 * analytics digest, driven by /api/mess/analytics with itemKey "summary") +
 * ticket ContextPanel + MessInchargeStatusBar + MessInchargeCommandBar
 * (finalize / revoke / count / menu / issue commands), plus the
 * MealServePanel as an extra panel in the main column. The 5 console
 * destinations point at the real mess sub-pages under /mess/* in this same
 * route group. Sub-pages pass their content through `children`.
 */
const MESS_ALLOWED_ROLES: Role[] = [
  "mess_incharge",
  "principal",
  "admin",
  "sysadmin",
];

export default function MessConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={MESS_ALLOWED_ROLES}>
      <Suspense fallback={<PageLoading />}>
        <div className="min-w-0">
          <RoleConsole role="mess_incharge" roleRoot="/mess">
            {children}
          </RoleConsole>
          <DevContactStrip />
        </div>
      </Suspense>
    </AuthGuard>
  );
}
