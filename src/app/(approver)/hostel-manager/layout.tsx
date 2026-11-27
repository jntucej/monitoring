"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleResponsiveShell } from "@/components/shell/RoleResponsiveShell";
import { GlobalEntityInspector } from "@/components/shared/GlobalEntityInspector";
import { HOSTEL_MANAGER_NAV, NAV_STORAGE_KEY } from "./_shell/nav";
import type { Role } from "@/lib/types";

const MANIFEST = {
  role: "hostel_manager",
  brand: { short: "Hostel Manager", long: "Residence Console" },
  rootHref: "/hostel-manager",
  hasProfile: false,
  storageKey: NAV_STORAGE_KEY,
  nav: HOSTEL_MANAGER_NAV,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["hostel_manager", "principal", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <RoleResponsiveShell manifest={MANIFEST}>{children}</RoleResponsiveShell>
        <GlobalEntityInspector />
      </Suspense>
    </AuthGuard>
  );
}
