"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleResponsiveShell } from "@/components/shell/RoleResponsiveShell";
import { GlobalEntityInspector } from "@/components/shared/GlobalEntityInspector";
import { EMO_NAV, NAV_STORAGE_KEY } from "./_shell/nav";
import type { Role } from "@/lib/types";

const MANIFEST = {
  role: "emo",
  brand: { short: "EMO", long: "Electrical Maintenance" },
  rootHref: "/emo",
  hasProfile: false,
  storageKey: NAV_STORAGE_KEY,
  nav: EMO_NAV,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["emo", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <RoleResponsiveShell manifest={MANIFEST}>{children}</RoleResponsiveShell>
        <GlobalEntityInspector />
      </Suspense>
    </AuthGuard>
  );
}
