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
 * shell is the RoleConsole: IconRail + feed board (the mess schedule, driven
 * by /api/mess/days with itemKey "day") + ticket ContextPanel +
 * MessInchargeStatusBar + MessInchargeCommandBar (meals / inventory /
 * requests / records / reports navigation), plus the TodayMealsPanel as an
 * extra panel in the main column. The 5 console destinations point at the
 * real mess sub-pages under /mess/* in this same route group. Sub-pages pass
 * their content through `children`.
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
