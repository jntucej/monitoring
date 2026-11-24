"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleResponsiveShell } from "@/components/shell/RoleResponsiveShell";
import { MESS_NAV, NAV_STORAGE_KEY } from "./_shell/nav";
import { GlobalEntityInspector } from "@/components/shared/GlobalEntityInspector";
import type { Role } from "@/lib/types";

const MANIFEST = {
  role: "mess_incharge",
  brand: { short: "Mess", long: "Mess Console" },
  rootHref: "/mess",
  hasProfile: false,
  storageKey: NAV_STORAGE_KEY,
  nav: MESS_NAV,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["mess_incharge", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <RoleResponsiveShell manifest={MANIFEST}>{children}</RoleResponsiveShell>
        <GlobalEntityInspector />
      </Suspense>
    </AuthGuard>
  );
}
