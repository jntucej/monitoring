"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { GlobalEntityInspector } from "@/components/shared/GlobalEntityInspector";
import { RoleResponsiveShell } from "@/components/shell/RoleResponsiveShell";
import { DEPUTY_WARDEN_NAV, NAV_STORAGE_KEY } from "./_shell/nav";
import type { Role } from "@/lib/types";

const MANIFEST = {
  role: "deputy_warden",
  brand: { short: "Deputy Warden", long: "Hostel Ops" },
  rootHref: "/deputy-warden",
  hasProfile: false,
  storageKey: NAV_STORAGE_KEY,
  nav: DEPUTY_WARDEN_NAV,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["deputy_warden", "hostel_manager", "principal", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <RoleResponsiveShell manifest={MANIFEST}>{children}</RoleResponsiveShell>
        <GlobalEntityInspector />
      </Suspense>
    </AuthGuard>
  );
}
