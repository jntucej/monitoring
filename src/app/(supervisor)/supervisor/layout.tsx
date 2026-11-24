"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleResponsiveShell } from "@/components/shell/RoleResponsiveShell";
import { GlobalEntityInspector } from "@/components/shared/GlobalEntityInspector";
import { SUPERVISOR_NAV, NAV_STORAGE_KEY } from "./_shell/nav";

const MANIFEST = {
  role: "supervisor",
  brand: { short: "Supervisor", long: "Shift Console" },
  rootHref: "/supervisor",
  storageKey: NAV_STORAGE_KEY,
  nav: SUPERVISOR_NAV,
};

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["supervisor", "principal", "admin", "sysadmin"]}>
      <Suspense fallback={<PageLoading />}>
        <RoleResponsiveShell manifest={MANIFEST}>{children}</RoleResponsiveShell>
        <GlobalEntityInspector />
      </Suspense>
    </AuthGuard>
  );
}
