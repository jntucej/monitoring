"use client";

import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { RoleResponsiveShell } from "@/components/shell/RoleResponsiveShell";
import { OIE_NAV, NAV_STORAGE_KEY } from "./_shell/nav";
import { GlobalEntityInspector } from "@/components/shared/GlobalEntityInspector";
import type { Role } from "@/lib/types";

const MANIFEST = {
  role: "oie",
  brand: { short: "OIE", long: "Exam Console" },
  rootHref: "/oie",
  hasProfile: false,
  storageKey: NAV_STORAGE_KEY,
  nav: OIE_NAV,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["oie", "exam_superintendent", "principal", "admin", "sysadmin"] as Role[]}>
      <Suspense fallback={<PageLoading />}>
        <RoleResponsiveShell manifest={MANIFEST}>{children}</RoleResponsiveShell>
        <GlobalEntityInspector />
      </Suspense>
    </AuthGuard>
  );
}
