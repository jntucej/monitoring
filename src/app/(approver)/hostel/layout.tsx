"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { GlobalEntityInspector } from "@/components/shared/GlobalEntityInspector";
import { RoleResponsiveShell } from "@/components/shell/RoleResponsiveShell";
import { HOSTEL_OS_NAV, NAV_STORAGE_KEY } from "./_shell/nav";
import type { Role } from "@/lib/types";

const MANIFEST = {
  role: "hostel",
  brand: { short: "Hostel & Security", long: "Gate · Passes · Mess · Warden OS" },
  rootHref: "/hostel",
  hasProfile: false,
  storageKey: NAV_STORAGE_KEY,
  nav: HOSTEL_OS_NAV,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["chief_warden", "deputy_warden", "hostel_manager", "principal", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <RoleResponsiveShell manifest={MANIFEST}>{children}</RoleResponsiveShell>
        <GlobalEntityInspector />
      </Suspense>
    </AuthGuard>
  );
}
