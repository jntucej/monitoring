"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleDesktopShell } from "@/components/shell/RoleDesktopShell";
import { RoleMobileShell } from "@/components/shell/RoleMobileShell";
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
        <div className="hidden lg:block">
          <RoleDesktopShell manifest={MANIFEST}>{children}</RoleDesktopShell>
        </div>
        <div className="block lg:hidden">
          <RoleMobileShell manifest={MANIFEST}>{children}</RoleMobileShell>
        </div>
      </Suspense>
    </AuthGuard>
  );
}
